import { useState, useMemo, useCallback } from "react";
import { Upload, Check, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/services/api-client";

type Step = "upload" | "mapping" | "preview" | "result";

const CATALOG_FIELDS = [
  { key: "platform", label: "Platform", required: true },
  { key: "pipelineName", label: "Pipeline Name", required: true },
  { key: "pipelineDescription", label: "Pipeline Description", required: false },
  { key: "businessSegment", label: "Business Segment", required: false },
  { key: "dataProvider", label: "Data Provider", required: false },
  { key: "dataDirection", label: "Data Direction", required: false },
  { key: "connectionType", label: "Connection Type", required: false },
  { key: "dataEnvironment", label: "Data Environment", required: false },
  { key: "ownerName", label: "Owner Name", required: false },
  { key: "ownerEmail", label: "Owner Email", required: false },
  { key: "engineerName", label: "Engineer Name", required: false },
  { key: "engineerEmail", label: "Engineer Email", required: false },
  { key: "dataClassification", label: "Data Classification", required: false },
  { key: "refreshFrequency", label: "Refresh Frequency", required: false },
] as const;

const HEADER_ALIASES: Record<string, string> = {
  "platform": "platform",
  "pipeline name": "pipelineName",
  "pipeline_name": "pipelineName",
  "job name": "pipelineName",
  "job_name": "pipelineName",
  "jobname": "pipelineName",
  "pipeline description": "pipelineDescription",
  "pipeline_description": "pipelineDescription",
  "description": "pipelineDescription",
  "business segment": "businessSegment",
  "business_segment": "businessSegment",
  "data provider": "dataProvider",
  "data provider/contractor": "dataProvider",
  "data_provider": "dataProvider",
  "data direction": "dataDirection",
  "data_direction": "dataDirection",
  "cursor type": "connectionType",
  "connection type": "connectionType",
  "connection_type": "connectionType",
  "data environment": "dataEnvironment",
  "data_environment": "dataEnvironment",
  "environment": "dataEnvironment",
  "owner name": "ownerName",
  "owner_name": "ownerName",
  "owner": "ownerName",
  "owner email": "ownerEmail",
  "owner_email": "ownerEmail",
  "engineer name": "engineerName",
  "engineer_name": "engineerName",
  "engineer": "engineerName",
  "engineer email": "engineerEmail",
  "engineer_email": "engineerEmail",
  "data classification": "dataClassification",
  "data_classification": "dataClassification",
  "classification": "dataClassification",
  "refresh frequency": "refreshFrequency",
  "refresh_frequency": "refreshFrequency",
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

interface Props {
  onComplete: () => void;
}

export function BulkImportPanel({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: { pipelineName: string; error: string }[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setCsvHeaders(parsed.headers);
      setCsvRows(parsed.rows);

      const autoMap: Record<string, string> = {};
      for (const header of parsed.headers) {
        const normalized = header.toLowerCase().trim();
        if (HEADER_ALIASES[normalized]) {
          autoMap[header] = HEADER_ALIASES[normalized];
        }
      }
      setMapping(autoMap);
      setStep("mapping");
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const mappedRows = useMemo(() => {
    return csvRows.map((row) => {
      const obj: Record<string, string> = {};
      csvHeaders.forEach((header, idx) => {
        const field = mapping[header];
        if (field) {
          obj[field] = row[idx] ?? "";
        }
      });
      return obj;
    });
  }, [csvRows, csvHeaders, mapping]);

  type ValidatedRow = Record<string, string> & { _status: "valid" | "warning" | "error" };

  const validatedRows = useMemo((): ValidatedRow[] => {
    return mappedRows.map((row) => {
      const hasPlatform = !!row.platform?.trim();
      const hasPipelineName = !!row.pipelineName?.trim();
      const status: ValidatedRow["_status"] = hasPlatform && hasPipelineName ? "valid" : "error";
      return { ...row, _status: status };
    });
  }, [mappedRows]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = validatedRows
        .filter((r) => r._status === "valid")
        .map((r) => ({
          platform: r.platform,
          pipelineName: r.pipelineName,
          pipelineDescription: r.pipelineDescription || null,
          businessSegment: r.businessSegment || null,
          dataProvider: r.dataProvider || null,
          dataDirection: r.dataDirection || null,
          connectionType: r.connectionType || null,
          dataEnvironment: r.dataEnvironment || null,
          ownerName: r.ownerName || null,
          ownerEmail: r.ownerEmail || null,
          engineerName: r.engineerName || null,
          engineerEmail: r.engineerEmail || null,
          isDocumented: false,
          tags: [],
          dataClassification: r.dataClassification || "INTERNAL",
          refreshFrequency: r.refreshFrequency || null,
          catalogStatus: "ACTIVE",
        }));
      const res = await api.bulkImportCatalog(payload);
      setResult(res);
      setStep("result");
    } catch {
      setResult({ inserted: 0, skipped: 0, errors: [{ pipelineName: "(all)", error: "Bulk import request failed" }] });
      setStep("result");
    } finally {
      setSubmitting(false);
    }
  }

  const validCount = validatedRows.filter((r) => r._status === "valid").length;
  const errorCount = validatedRows.filter((r) => r._status === "error").length;
  const mappedFieldCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] overflow-hidden">
      <div className="px-6 py-4 border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">Bulk CSV Import</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Upload a CSV file to import multiple pipeline entries at once
        </p>
      </div>

      <div className="p-6">
        {/* Upload */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-colors duration-200 ${
              dragOver ? "border-accent bg-accent-muted/20" : "border-border-default"
            }`}
          >
            <Upload size={32} className="text-text-muted mb-3" />
            <p className="text-sm text-text-primary mb-1">Drag and drop a CSV file here</p>
            <p className="text-xs text-text-muted mb-4">or click to browse</p>
            <label className="px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium flex items-center cursor-pointer hover:bg-accent/90 transition-colors duration-200">
              Choose File
              <input type="file" accept=".csv,.txt" onChange={handleFileInput} className="hidden" />
            </label>
          </div>
        )}

        {/* Column mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                {csvHeaders.length} columns detected, {csvRows.length} rows. Map CSV columns to catalog fields.
              </p>
              <span className="text-xs text-accent font-medium">{mappedFieldCount} mapped</span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="text-xs text-text-primary w-48 truncate shrink-0" title={header}>
                    {header}
                  </span>
                  <span className="text-text-muted text-xs">&rarr;</span>
                  <select
                    value={mapping[header] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                    className="flex-1 h-8 px-2 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary outline-none focus:border-accent transition-colors duration-200"
                  >
                    <option value="">Skip this column</option>
                    {CATALOG_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep("preview")}
                disabled={!mapping[csvHeaders.find((h) => mapping[h] === "platform") ?? ""] || !mapping[csvHeaders.find((h) => mapping[h] === "pipelineName") ?? ""]}
                className="px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Preview Import
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-success">
                <Check size={12} /> {validCount} valid
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-danger">
                  <AlertCircle size={12} /> {errorCount} errors (skipped)
                </span>
              )}
            </div>

            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-3 py-2">Status</th>
                    <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-3 py-2">Platform</th>
                    <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-3 py-2">Pipeline Name</th>
                    <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-3 py-2">Segment</th>
                    <th className="text-left text-[10px] font-medium uppercase tracking-[0.06em] text-text-muted px-3 py-2">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {validatedRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-border-default text-xs ${
                        row._status === "error" ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        {row._status === "valid" && <Check size={12} className="text-success" />}
                        {row._status === "warning" && <AlertTriangle size={12} className="text-warning" />}
                        {row._status === "error" && <AlertCircle size={12} className="text-danger" />}
                      </td>
                      <td className="px-3 py-2 text-text-primary">{row.platform || "—"}</td>
                      <td className="px-3 py-2 text-text-primary">{row.pipelineName || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.businessSegment || "—"}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.ownerName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep("mapping")}
                className="px-3 h-9 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors duration-200 cursor-pointer"
              >
                Back to Mapping
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || validCount === 0}
                className="flex items-center gap-1.5 px-5 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {submitting ? "Importing..." : `Import ${validCount} Entries`}
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {step === "result" && result && (
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 rounded-full bg-success-muted flex items-center justify-center mx-auto">
              <Check size={24} className="text-success" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Import Complete</h3>
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-success">{result.inserted} inserted</span>
              {result.skipped > 0 && <span className="text-warning">{result.skipped} duplicates skipped</span>}
              {result.errors.length > 0 && <span className="text-danger">{result.errors.length} errors</span>}
            </div>
            {result.errors.length > 0 && (
              <div className="text-left max-h-32 overflow-y-auto bg-bg-primary rounded-lg p-3 text-xs">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-danger py-0.5">{err.pipelineName}: {err.error}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { setStep("upload"); setCsvHeaders([]); setCsvRows([]); setMapping({}); setResult(null); }}
                className="px-4 h-9 rounded-lg border border-border-default text-sm text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors duration-200 cursor-pointer"
              >
                Import More
              </button>
              <button
                onClick={onComplete}
                className="px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors duration-200"
              >
                View Catalog
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
