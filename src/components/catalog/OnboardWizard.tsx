import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, Plus, Trash2, Loader2 } from "lucide-react";
import { api } from "@/services/api-client";
import type { CatalogEntry, JobRegistryRecord } from "@/types/pipeline";

const STEPS = [
  "General Info",
  "Technical Details",
  "Lineage",
  "Diagrams & Docs",
  "Review & Submit",
] as const;

const PLATFORMS = ["AIRBYTE", "DATABRICKS", "DBT_CLOUD", "POWER_AUTOMATE", "SNOWFLAKE"];
const DIRECTIONS = ["INGESTION", "EGRESS", "TRANSFORMATION"];
const ENVIRONMENTS = ["DEV", "STAGING", "PROD"];
const FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "ON_DEMAND"];
const CLASSIFICATIONS = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"];
const RELATIONSHIP_TYPES = ["FEEDS", "TRIGGERS", "DEPENDS_ON"];
const DIAGRAM_TYPES = ["ARCHITECTURE", "DATA_FLOW", "SEQUENCE", "ERD"];
const DOC_TYPES = [
  "SHAREPOINT_FOLDER", "SHAREPOINT_LIST", "CONFLUENCE", "WIKI",
  "TEAMS_CHANNEL", "RUNBOOK", "SOP", "OTHER",
];

interface FormData {
  platform: string;
  pipelineName: string;
  pipelineDescription: string;
  businessSegment: string;
  dataProvider: string;
  ownerName: string;
  ownerEmail: string;
  engineerName: string;
  engineerEmail: string;
  connectionType: string;
  dataDirection: string;
  dataEnvironment: string;
  refreshFrequency: string;
  dataClassification: string;
  entities: { entityName: string; entityDescription: string; databaseDetails: string; uri: string }[];
  upstreamIds: { catalogId: string; type: string }[];
  downstreamIds: { catalogId: string; type: string }[];
  diagrams: { title: string; url: string; diagramType: string; thumbnailUrl: string; description: string }[];
  documents: { title: string; url: string; docType: string; description: string }[];
}

const EMPTY_FORM: FormData = {
  platform: "",
  pipelineName: "",
  pipelineDescription: "",
  businessSegment: "",
  dataProvider: "",
  ownerName: "",
  ownerEmail: "",
  engineerName: "",
  engineerEmail: "",
  connectionType: "",
  dataDirection: "",
  dataEnvironment: "",
  refreshFrequency: "",
  dataClassification: "INTERNAL",
  entities: [],
  upstreamIds: [],
  downstreamIds: [],
  diagrams: [],
  documents: [],
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs text-text-muted font-medium mb-1">{children}</label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors duration-200"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 px-3 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors duration-200 appearance-none cursor-pointer"
    >
      <option value="">{placeholder ?? "Select..."}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors duration-200 resize-none"
    />
  );
}

interface Props {
  existingEntries: CatalogEntry[];
  onComplete: () => void;
}

export function OnboardWizard({ existingEntries, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [registryJobs, setRegistryJobs] = useState<JobRegistryRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.getJobRegistry().then(setRegistryJobs);
  }, []);

  const unregisteredJobs = registryJobs.filter(
    (rj) => !existingEntries.some(
      (ce) => ce.platform === rj.platform && ce.pipelineName === rj.jobName,
    ),
  );

  function handleRegistrySelect(rj: JobRegistryRecord) {
    setForm((f) => ({
      ...f,
      platform: rj.platform,
      pipelineName: rj.jobName,
      pipelineDescription: rj.description || f.pipelineDescription,
      businessSegment: rj.businessFunction || f.businessSegment,
    }));
  }

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.createCatalogEntry({
        platform: form.platform,
        pipelineName: form.pipelineName,
        pipelineDescription: form.pipelineDescription || null,
        businessSegment: form.businessSegment || null,
        dataProvider: form.dataProvider || null,
        dataDirection: form.dataDirection || null,
        connectionType: form.connectionType || null,
        dataEnvironment: form.dataEnvironment || null,
        ownerName: form.ownerName || null,
        ownerEmail: form.ownerEmail || null,
        engineerName: form.engineerName || null,
        engineerEmail: form.engineerEmail || null,
        isDocumented: form.diagrams.length > 0 || form.documents.length > 0,
        tags: [],
        dataClassification: form.dataClassification,
        refreshFrequency: form.refreshFrequency || null,
        catalogStatus: "ACTIVE",
      });

      const catalogId = result.catalogId;

      for (const ent of form.entities) {
        if (ent.entityName.trim()) {
          await api.createEntity(catalogId, {
            entityName: ent.entityName,
            entityDescription: ent.entityDescription || null,
            databaseDetails: ent.databaseDetails || null,
            uri: ent.uri || null,
          });
        }
      }

      for (const up of form.upstreamIds) {
        await api.createLineageEdge({
          sourceCatalogId: up.catalogId,
          targetCatalogId: catalogId,
          relationshipType: up.type,
        });
      }
      for (const down of form.downstreamIds) {
        await api.createLineageEdge({
          sourceCatalogId: catalogId,
          targetCatalogId: down.catalogId,
          relationshipType: down.type,
        });
      }
      for (const d of form.diagrams) {
        if (d.title && d.url) {
          await api.createDiagram(catalogId, {
            title: d.title,
            url: d.url,
            diagramType: d.diagramType || null,
            thumbnailUrl: d.thumbnailUrl || null,
            description: d.description || null,
          });
        }
      }
      for (const doc of form.documents) {
        if (doc.title && doc.url) {
          await api.createDocument(catalogId, {
            title: doc.title,
            url: doc.url,
            docType: doc.docType || null,
            description: doc.description || null,
          });
        }
      }

      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create catalog entry");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-bg-surface border border-border-default rounded-[14px] p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-success-muted flex items-center justify-center mx-auto">
          <Check size={24} className="text-success" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">Pipeline Added</h3>
        <p className="text-sm text-text-secondary">
          <span className="text-text-primary font-medium">{form.pipelineName}</span> has been added to the catalog.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setStep(0); setSuccess(false); }}
            className="px-4 h-9 rounded-lg border border-border-default text-sm text-text-secondary hover:bg-bg-primary hover:text-text-primary transition-colors duration-200 cursor-pointer"
          >
            Add Another
          </button>
          <button
            onClick={onComplete}
            className="px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors duration-200"
          >
            View Catalog
          </button>
        </div>
      </div>
    );
  }

  const canNext =
    step === 0 ? form.platform && form.pipelineName :
    step === 4 ? false :
    true;

  return (
    <div className="bg-bg-surface border border-border-default rounded-[14px] overflow-hidden">
      {/* Step indicator */}
      <div className="flex border-b border-border-default">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i < step && setStep(i)}
            className={`flex-1 px-3 py-3 text-xs font-medium text-center transition-colors duration-200 border-b-2 -mb-px ${
              i === step
                ? "text-accent border-accent"
                : i < step
                  ? "text-success border-success/30 cursor-pointer hover:text-text-primary"
                  : "text-text-muted border-transparent"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {i < step ? <Check size={12} className="text-success" /> : <span className="text-[10px]">{i + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Step 1: General Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4">General Information</h3>

            {unregisteredJobs.length > 0 && (
              <div className="mb-4 p-3 rounded-lg border border-accent-muted bg-accent-muted/30">
                <p className="text-xs text-accent font-medium mb-2">
                  Auto-fill from Job Registry ({unregisteredJobs.length} unregistered)
                </p>
                <select
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    if (!isNaN(idx)) handleRegistrySelect(unregisteredJobs[idx]);
                  }}
                  className="w-full h-8 px-2 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary outline-none"
                  defaultValue=""
                >
                  <option value="">Select a job to auto-fill...</option>
                  {unregisteredJobs.map((rj, idx) => (
                    <option key={`${rj.platform}-${rj.jobName}`} value={idx}>
                      [{rj.platform}] {rj.jobName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Platform *</Label>
                <Select value={form.platform} onChange={(v) => update("platform", v)} options={PLATFORMS} placeholder="Select platform" />
              </div>
              <div>
                <Label>Pipeline Name *</Label>
                <Input value={form.pipelineName} onChange={(v) => update("pipelineName", v)} placeholder="e.g., Salesforce Accounts Sync" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Business Segment</Label>
                <Input value={form.businessSegment} onChange={(v) => update("businessSegment", v)} placeholder="e.g., Finance" />
              </div>
              <div>
                <Label>Data Provider</Label>
                <Input value={form.dataProvider} onChange={(v) => update("dataProvider", v)} placeholder="e.g., Salesforce" />
              </div>
            </div>

            <div>
              <Label>Pipeline Description</Label>
              <TextArea value={form.pipelineDescription} onChange={(v) => update("pipelineDescription", v)} placeholder="What does this pipeline do?" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Owner Name</Label>
                <Input value={form.ownerName} onChange={(v) => update("ownerName", v)} placeholder="Primary steward" />
              </div>
              <div>
                <Label>Owner Email</Label>
                <Input value={form.ownerEmail} onChange={(v) => update("ownerEmail", v)} placeholder="owner@company.com" type="email" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Engineer Name</Label>
                <Input value={form.engineerName} onChange={(v) => update("engineerName", v)} placeholder="Implementing engineer" />
              </div>
              <div>
                <Label>Engineer Email</Label>
                <Input value={form.engineerEmail} onChange={(v) => update("engineerEmail", v)} placeholder="engineer@company.com" type="email" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Technical Details + Entities */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Technical Details</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Data Direction</Label>
                <Select value={form.dataDirection} onChange={(v) => update("dataDirection", v)} options={DIRECTIONS} />
              </div>
              <div>
                <Label>Connection Type</Label>
                <Input value={form.connectionType} onChange={(v) => update("connectionType", v)} placeholder="API, JDBC, SFTP" />
              </div>
              <div>
                <Label>Environment</Label>
                <Select value={form.dataEnvironment} onChange={(v) => update("dataEnvironment", v)} options={ENVIRONMENTS} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Refresh Frequency</Label>
                <Select value={form.refreshFrequency} onChange={(v) => update("refreshFrequency", v)} options={FREQUENCIES} />
              </div>
              <div>
                <Label>Data Classification</Label>
                <Select value={form.dataClassification} onChange={(v) => update("dataClassification", v)} options={CLASSIFICATIONS} />
              </div>
            </div>

            <div className="pt-2 border-t border-border-default">
              <h4 className="text-xs font-semibold text-text-primary mb-3">Entities / Streams</h4>
              <p className="text-xs text-text-muted mb-3">
                Each entity is a specific stream, table, or object this pipeline processes.
              </p>
              {form.entities.map((ent, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border-default mb-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={ent.entityName}
                        onChange={(v) => { const next = [...form.entities]; next[idx] = { ...next[idx], entityName: v }; update("entities", next); }}
                        placeholder="Entity / stream name (e.g., ExternalCustomers)"
                      />
                    </div>
                    <button
                      onClick={() => update("entities", form.entities.filter((_, i) => i !== idx))}
                      className="p-2 text-danger hover:bg-danger-muted rounded-lg transition-colors duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Input
                    value={ent.entityDescription}
                    onChange={(v) => { const next = [...form.entities]; next[idx] = { ...next[idx], entityDescription: v }; update("entities", next); }}
                    placeholder="Entity description (e.g., MSSQL → CuraProd Snowflake)"
                  />
                  <Input
                    value={ent.databaseDetails}
                    onChange={(v) => { const next = [...form.entities]; next[idx] = { ...next[idx], databaseDetails: v }; update("entities", next); }}
                    placeholder="Database details (e.g., PRD_EDW_RAW.SALESFORCE.ACCOUNTS)"
                  />
                  <Input
                    value={ent.uri}
                    onChange={(v) => { const next = [...form.entities]; next[idx] = { ...next[idx], uri: v }; update("entities", next); }}
                    placeholder="URI / endpoint (optional)"
                  />
                </div>
              ))}
              <button
                onClick={() => update("entities", [...form.entities, { entityName: "", entityDescription: "", databaseDetails: "", uri: "" }])}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors duration-200"
              >
                <Plus size={12} /> Add entity
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Lineage */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Lineage Connections</h3>

            <div>
              <Label>Upstream Sources (feeds this pipeline)</Label>
              {form.upstreamIds.map((up, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select
                    value={up.catalogId}
                    onChange={(e) => {
                      const next = [...form.upstreamIds];
                      next[idx] = { ...next[idx], catalogId: e.target.value };
                      update("upstreamIds", next);
                    }}
                    className="flex-1 h-9 px-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary outline-none"
                  >
                    <option value="">Select pipeline...</option>
                    {existingEntries.map((e) => (
                      <option key={e.catalogId} value={e.catalogId}>[{e.platform}] {e.pipelineName}</option>
                    ))}
                  </select>
                  <select
                    value={up.type}
                    onChange={(e) => {
                      const next = [...form.upstreamIds];
                      next[idx] = { ...next[idx], type: e.target.value };
                      update("upstreamIds", next);
                    }}
                    className="w-32 h-9 px-2 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary outline-none"
                  >
                    {RELATIONSHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={() => update("upstreamIds", form.upstreamIds.filter((_, i) => i !== idx))}
                    className="p-2 text-danger hover:bg-danger-muted rounded-lg transition-colors duration-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => update("upstreamIds", [...form.upstreamIds, { catalogId: "", type: "FEEDS" }])}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors duration-200"
              >
                <Plus size={12} /> Add upstream source
              </button>
            </div>

            <div>
              <Label>Downstream Targets (this pipeline feeds)</Label>
              {form.downstreamIds.map((down, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select
                    value={down.catalogId}
                    onChange={(e) => {
                      const next = [...form.downstreamIds];
                      next[idx] = { ...next[idx], catalogId: e.target.value };
                      update("downstreamIds", next);
                    }}
                    className="flex-1 h-9 px-2 bg-bg-primary border border-border-default rounded-lg text-sm text-text-primary outline-none"
                  >
                    <option value="">Select pipeline...</option>
                    {existingEntries.map((e) => (
                      <option key={e.catalogId} value={e.catalogId}>[{e.platform}] {e.pipelineName}</option>
                    ))}
                  </select>
                  <select
                    value={down.type}
                    onChange={(e) => {
                      const next = [...form.downstreamIds];
                      next[idx] = { ...next[idx], type: e.target.value };
                      update("downstreamIds", next);
                    }}
                    className="w-32 h-9 px-2 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary outline-none"
                  >
                    {RELATIONSHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={() => update("downstreamIds", form.downstreamIds.filter((_, i) => i !== idx))}
                    className="p-2 text-danger hover:bg-danger-muted rounded-lg transition-colors duration-200"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => update("downstreamIds", [...form.downstreamIds, { catalogId: "", type: "FEEDS" }])}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors duration-200"
              >
                <Plus size={12} /> Add downstream target
              </button>
            </div>

            {form.upstreamIds.length === 0 && form.downstreamIds.length === 0 && (
              <p className="text-xs text-text-muted py-2">
                No lineage connections yet. You can skip this step and add connections later.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Diagrams & Documents */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-4">Diagrams</h3>
              {form.diagrams.map((d, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border-default mb-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input value={d.title} onChange={(v) => { const next = [...form.diagrams]; next[idx] = { ...next[idx], title: v }; update("diagrams", next); }} placeholder="Diagram title" />
                    </div>
                    <select
                      value={d.diagramType}
                      onChange={(e) => { const next = [...form.diagrams]; next[idx] = { ...next[idx], diagramType: e.target.value }; update("diagrams", next); }}
                      className="w-36 h-9 px-2 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary outline-none"
                    >
                      <option value="">Type...</option>
                      {DIAGRAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={() => update("diagrams", form.diagrams.filter((_, i) => i !== idx))}
                      className="p-2 text-danger hover:bg-danger-muted rounded-lg transition-colors duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Input value={d.url} onChange={(v) => { const next = [...form.diagrams]; next[idx] = { ...next[idx], url: v }; update("diagrams", next); }} placeholder="URL (e.g., https://lucid.app/...)" />
                </div>
              ))}
              <button
                onClick={() => update("diagrams", [...form.diagrams, { title: "", url: "", diagramType: "", thumbnailUrl: "", description: "" }])}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors duration-200"
              >
                <Plus size={12} /> Add diagram
              </button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-4">External Documentation</h3>
              {form.documents.map((doc, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border-default mb-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input value={doc.title} onChange={(v) => { const next = [...form.documents]; next[idx] = { ...next[idx], title: v }; update("documents", next); }} placeholder="Document title" />
                    </div>
                    <select
                      value={doc.docType}
                      onChange={(e) => { const next = [...form.documents]; next[idx] = { ...next[idx], docType: e.target.value }; update("documents", next); }}
                      className="w-44 h-9 px-2 bg-bg-primary border border-border-default rounded-lg text-xs text-text-primary outline-none"
                    >
                      <option value="">Type...</option>
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                    </select>
                    <button
                      onClick={() => update("documents", form.documents.filter((_, i) => i !== idx))}
                      className="p-2 text-danger hover:bg-danger-muted rounded-lg transition-colors duration-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <Input value={doc.url} onChange={(v) => { const next = [...form.documents]; next[idx] = { ...next[idx], url: v }; update("documents", next); }} placeholder="URL (e.g., https://sharepoint.com/...)" />
                  <Input value={doc.description} onChange={(v) => { const next = [...form.documents]; next[idx] = { ...next[idx], description: v }; update("documents", next); }} placeholder="Description (optional)" />
                </div>
              ))}
              <button
                onClick={() => update("documents", [...form.documents, { title: "", url: "", docType: "", description: "" }])}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors duration-200"
              >
                <Plus size={12} /> Add document
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Review & Submit</h3>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
              <ReviewRow label="Platform" value={form.platform} />
              <ReviewRow label="Pipeline Name" value={form.pipelineName} />
              <ReviewRow label="Business Segment" value={form.businessSegment} />
              <ReviewRow label="Data Provider" value={form.dataProvider} />
              <ReviewRow label="Direction" value={form.dataDirection} />
              <ReviewRow label="Environment" value={form.dataEnvironment} />
              <ReviewRow label="Classification" value={form.dataClassification} />
              <ReviewRow label="Refresh" value={form.refreshFrequency} />
              <ReviewRow label="Connection" value={form.connectionType} />
              <ReviewRow label="Owner" value={form.ownerName} />
              <ReviewRow label="Engineer" value={form.engineerName} />
            </div>

            {form.pipelineDescription && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase text-text-muted mb-1">Description</p>
                <p className="text-xs text-text-secondary">{form.pipelineDescription}</p>
              </div>
            )}

            <div className="flex gap-4 text-xs text-text-muted mt-3">
              <span>{form.entities.filter((e) => e.entityName).length} entities</span>
              <span>{form.upstreamIds.length + form.downstreamIds.length} lineage connections</span>
              <span>{form.diagrams.filter((d) => d.title && d.url).length} diagrams</span>
              <span>{form.documents.filter((d) => d.title && d.url).length} documents</span>
            </div>

            {!form.platform && <p className="text-xs text-danger">Platform is required</p>}
            {!form.pipelineName && <p className="text-xs text-danger">Pipeline name is required</p>}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border-default">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1 px-3 h-9 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
        >
          <ChevronLeft size={14} /> Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canNext}
            className="flex items-center gap-1 px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Next <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !form.platform || !form.pipelineName}
            className="flex items-center gap-1.5 px-5 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary font-medium">{value || "—"}</span>
    </div>
  );
}
