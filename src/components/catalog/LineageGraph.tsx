import { useMemo, useState } from "react";
import type { EntityLineageRecord } from "@/types/pipeline";

// ─── Data structures ──────────────────────────────────────────────────────────

interface PipelineGroup {
  catalogId: string;
  pipelineName: string;
  platform: string;
  dataProvider: string;
  entities: EntityLineageRecord[];
}

interface ProviderGroup {
  provider: string;    // raw, e.g. "LeafTrade REST API"
  display: string;     // short, e.g. "LeafTrade"
  platform: string;
  pipelines: PipelineGroup[];
  fill: string; stroke: string; text: string; edge: string;
}

interface PlatformGroup {
  platform: string;   // e.g. "AIRBYTE"
  name: string;       // e.g. "Airbyte"
  icon: string;       // e.g. "AB"
  providers: ProviderGroup[];
}

// ─── Color palette (dark theme — matches reference HTML dark-mode values) ─────

const PALETTE = [
  { fill:"#D1FAE5", stroke:"#059669", text:"#065F46", edge:"#059669" },
  { fill:"#EDE9FE", stroke:"#7C3AED", text:"#4C1D95", edge:"#7C3AED" },
  { fill:"#FFE4D6", stroke:"#EA580C", text:"#7C2D12", edge:"#EA580C" },
  { fill:"#FEF3C7", stroke:"#D97706", text:"#78350F", edge:"#D97706" },
  { fill:"#DBEAFE", stroke:"#2563EB", text:"#1E3A8A", edge:"#2563EB" },
  { fill:"#F3E8FF", stroke:"#9333EA", text:"#581C87", edge:"#9333EA" },
  { fill:"#DCFCE7", stroke:"#16A34A", text:"#14532D", edge:"#16A34A" },
  { fill:"#FEF9C3", stroke:"#CA8A04", text:"#713F12", edge:"#CA8A04" },
];

// Platform hub node (Airbyte etc.)
const PLAT  = { fill:"#F1F5F9", stroke:"#94A3B8", text:"#1E293B" };
// Neutral mid node (pipeline label)
const MID   = { fill:"#F1F5F9", stroke:"#CBD5E1", text:"#334155" };
// Snowflake destination styling
const SF = { bg:"rgba(37,99,235,0.05)", border:"rgba(37,99,235,0.25)", rowBg:"#F8FAFC", rowBorder:"#E2E8F0", labelColor:"#94A3B8", textColor:"#1E293B" };

function palette(idx: number) { return PALETTE[idx % PALETTE.length]; }

// ─── Platform / provider labels ───────────────────────────────────────────────

const PLAT_META: Record<string, { name: string; icon: string }> = {
  AIRBYTE:       { name:"Airbyte",       icon:"AB" },
  DATABRICKS:    { name:"Databricks",    icon:"DB" },
  SNOWFLAKE:     { name:"Snowflake",     icon:"SF" },
  POWER_AUTOMATE:{ name:"Power Automate",icon:"PA" },
  DBT_CLOUD:     { name:"dbt Cloud",     icon:"dbt"},
  AZURE_FUNCTION:{ name:"Azure Fn",      icon:"AZ" },
  SHAREPOINT:    { name:"SharePoint",    icon:"SP" },
};

function platMeta(p: string) {
  return PLAT_META[p.toUpperCase()] ?? { name: p, icon: p.slice(0,2).toUpperCase() };
}

function shortProvider(provider: string): string {
  return provider.replace(/REST API/i,"").replace(/\bAPI\b/i,"").replace(/\bSQL\b/i,"").trim() || provider;
}

// ─── Stream / table display helpers ──────────────────────────────────────────

function streamLabel(e: EntityLineageRecord): string {
  const s = e.stream;
  if (s && !s.toLowerCase().startsWith("database") && !s.includes(".") && s.length < 60) return s;
  return e.entityName;
}
function tableLabel(e: EntityLineageRecord): string {
  return e.tableName ?? e.entityName.split(".")[2] ?? e.entityName;
}
function schemaLabel(e: EntityLineageRecord): string {
  return e.schema ?? e.entityName.split(".")[1] ?? "—";
}
function dbLabel(e: EntityLineageRecord): string {
  return e.database ?? e.destDb ?? e.entityName.split(".")[0] ?? "—";
}

function providerSchemas(g: ProviderGroup): string {
  const schemas = [...new Set(g.pipelines.flatMap(p => p.entities.map(e => schemaLabel(e))).filter(Boolean))];
  return schemas.length === 0 ? "—" : schemas.length === 1 ? schemas[0] : `${schemas[0]} +${schemas.length-1}`;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const MONO = "ui-monospace,'SFMono-Regular',monospace";
const clamp = (s: string, n: number) => s.length > n ? s.slice(0, n-1)+"…" : s;

/**
 * Returns the text and font-size that will fit inside `boxWidth` pixels.
 * Uses monospace character ratio (0.62 × fontSize per glyph).
 * Shrinks font from baseFontSize down to minFontSize before hard-truncating.
 */
function fitText(label: string, boxWidth: number, baseFontSize=11, minFontSize=8, pad=10): {text:string; fs:number} {
  const MONO_RATIO = 0.62;
  const avail = boxWidth - pad * 2;
  const neededAt = (fs: number) => label.length * fs * MONO_RATIO;
  if (neededAt(baseFontSize) <= avail) return { text: label, fs: baseFontSize };
  const shrunk = Math.floor(avail / (label.length * MONO_RATIO));
  if (shrunk >= minFontSize) return { text: label, fs: shrunk };
  // Font can't shrink any more — hard truncate at minFontSize
  const maxChars = Math.floor(avail / (minFontSize * MONO_RATIO));
  return { text: label.slice(0, maxChars - 1) + "…", fs: minFontSize };
}

function SvgDefs({ colors }: { colors: string[] }) {
  return (
    <defs>
      {[...new Set(colors)].map(c => (
        <marker key={c} id={`arr-${c.replace(/[^a-f0-9]/gi,"")}`}
          viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      ))}
    </defs>
  );
}

function arrId(c: string) { return `url(#arr-${c.replace(/[^a-f0-9]/gi,"").toLowerCase()})`; }

interface NodeProps {
  x:number; y:number; w:number; h:number;
  fill:string; stroke:string; strokeW?:number;
  line1:string; line2?:string;
  textColor:string; subColor?:string;
  onClick?:()=>void; selected?:boolean;
}
function SvgNode({ x,y,w,h,fill,stroke,strokeW=0.75,line1,line2,textColor,subColor,onClick,selected }:NodeProps) {
  const cx=x+w/2, cy=y+h/2;
  const { text: l1, fs: l1fs } = fitText(line1, w);
  // sub-label uses proportional font — estimate at 0.58 ratio, base 9
  const { text: l2, fs: l2fs } = line2 ? fitText(line2, w, 9, 7, 8) : { text: "", fs: 9 };
  return (
    <g onClick={onClick} style={onClick?{cursor:"pointer"}:undefined}>
      <rect x={x} y={y} width={w} height={h} rx={5}
        fill={fill} stroke={selected?"#e8822a":stroke} strokeWidth={selected?1.5:strokeW}/>
      {line2 ? <>
        <text x={cx} y={cy-7} textAnchor="middle" dominantBaseline="central"
          fontSize={l1fs} fontWeight={600} fill={textColor} style={{fontFamily:MONO}}>
          {l1}
        </text>
        <text x={cx} y={cy+8} textAnchor="middle" dominantBaseline="central"
          fontSize={l2fs} fill={subColor??textColor} opacity={0.7}>
          {l2}
        </text>
      </> : (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fontSize={l1fs} fontWeight={600} fill={textColor} style={{fontFamily:MONO}}>
          {l1}
        </text>
      )}
    </g>
  );
}

interface EdgeProps { x1:number;y1:number;x2:number;y2:number;color:string;sw?:number; }
function SvgEdge({ x1,y1,x2,y2,color,sw=1.2 }:EdgeProps) {
  const id = arrId(color);
  if (y1 === y2) {
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw}
      strokeOpacity={0.65} markerEnd={id}/>;
  }
  const cpx = (x1+x2)/2;
  return <path d={`M ${x1} ${y1} C ${cpx} ${y1} ${cpx} ${y2} ${x2} ${y2}`}
    fill="none" stroke={color} strokeWidth={sw} strokeOpacity={0.65} markerEnd={id}/>;
}

// ─── Overview diagram (default: simple row per source) ────────────────────────

function OverviewDiagram({ platformGroups, onSelPlat, zoom=1 }: {
  platformGroups: PlatformGroup[];
  onSelPlat: (p: string) => void;
  zoom?: number;
}) {
  const allProviders = platformGroups.flatMap(pg => pg.providers);
  const n = allProviders.length;
  const ROW_H=38, GAP=10, TOP=32, BOT=14;
  const SVG_H = TOP + n*(ROW_H+GAP) - GAP + BOT;
  const SVG_W=460, srcX=8, srcW=112, midX=186, midW=76, sfX=318, sfW=134;
  const rowCY = (i:number) => TOP + i*(ROW_H+GAP) + ROW_H/2;
  const allEdges = allProviders.map(g=>g.edge);

  return (
    <svg width={SVG_W*zoom} height={SVG_H*zoom} viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg">
      <SvgDefs colors={allEdges}/>
      <text x={srcX+srcW/2} y={18} textAnchor="middle" fontSize={9} fill="#94A3B8">Source API</text>
      <text x={midX+midW/2} y={18} textAnchor="middle" fontSize={9} fill="#94A3B8">Platform</text>
      <text x={sfX+sfW/2} y={18} textAnchor="middle" fontSize={9} fill="#94A3B8">Snowflake · CURAPROD</text>
      {allProviders.map((g, i) => {
        const cy = rowCY(i);
        const pm = platMeta(g.platform);
        const entCount = g.pipelines.reduce((s,p)=>s+p.entities.length,0);
        return (
          <g key={g.provider}>
            <SvgNode x={srcX} y={cy-ROW_H/2} w={srcW} h={ROW_H}
              fill={g.fill} stroke={g.stroke} line1={g.display} line2={`${g.pipelines.length} pipelines`}
              textColor={g.text} subColor="#94A3B8" onClick={()=>onSelPlat(g.platform)}/>
            <SvgEdge x1={srcX+srcW} y1={cy} x2={midX} y2={cy} color={g.edge}/>
            <SvgNode x={midX} y={cy-ROW_H/2} w={midW} h={ROW_H}
              fill={PLAT.fill} stroke={PLAT.stroke} line1={pm.name} textColor={PLAT.text}/>
            <SvgEdge x1={midX+midW} y1={cy} x2={sfX} y2={cy} color={g.edge}/>
            <SvgNode x={sfX} y={cy-ROW_H/2} w={sfW} h={ROW_H}
              fill="#EFF6FF" stroke="#93C5FD"
              line1={providerSchemas(g)} line2={`${entCount} streams`}
              textColor="#1E293B" subColor="#94A3B8"/>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Platform diagram (fan-in/fan-out via bezier curves) ──────────────────────

function PlatformDiagram({ pg, onSelProvider, zoom=1 }: {
  pg: PlatformGroup;
  onSelProvider: (p: string) => void;
  zoom?: number;
}) {
  const providers = pg.providers;
  const n = providers.length;
  const ROW_H=36, GAP=12;
  const TOP=32, BOT=14;
  const SVG_H = TOP + n*(ROW_H+GAP) - GAP + BOT;
  const SVG_W=480;
  const srcX=8, srcW=96, srcH=36;
  const abX=192, abW=76, abH=44;
  const schX=376, schW=98, schH=36;

  const rowCY = (i:number) => TOP + i*(ROW_H+GAP) + ROW_H/2;
  const abCY = (TOP + (n-1)*(ROW_H+GAP)/2) + ROW_H/2;
  const allEdges = providers.map(g=>g.edge);

  return (
    <svg width={SVG_W*zoom} height={SVG_H*zoom} viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg">
      <SvgDefs colors={allEdges}/>
      <text x={srcX+srcW/2} y={22} textAnchor="middle" fontSize={9} fill="#94A3B8">Source API</text>
      <text x={abX+abW/2} y={22} textAnchor="middle" fontSize={9} fill="#94A3B8">Platform</text>
      <text x={schX+schW/2} y={22} textAnchor="middle" fontSize={9} fill="#94A3B8">Snowflake · AIRBYTE_DB</text>

      {/* Central platform hub */}
      <SvgNode x={abX} y={abCY-abH/2} w={abW} h={abH}
        fill={PLAT.fill} stroke={PLAT.stroke} line1={pg.name} textColor={PLAT.text}/>

      {providers.map((g, i) => {
        const cy = rowCY(i);
        const cnt = g.pipelines.reduce((s,p)=>s+p.entities.length,0);
        return (
          <g key={g.provider}>
            {/* Source node */}
            <SvgNode x={srcX} y={cy-srcH/2} w={srcW} h={srcH}
              fill={g.fill} stroke={g.stroke}
              line1={g.display} line2={`${cnt} streams`}
              textColor={g.text} subColor="#94A3B8"
              onClick={()=>onSelProvider(g.provider)}/>
            {/* Source → Platform bezier */}
            <SvgEdge x1={srcX+srcW} y1={cy} x2={abX} y2={abCY} color={g.edge}/>
            {/* Schema node */}
            <SvgNode x={schX} y={cy-schH/2} w={schW} h={schH}
              fill={g.fill} stroke={g.stroke}
              line1={providerSchemas(g)} line2="CuraProd"
              textColor={g.text} subColor="#94A3B8"/>
            {/* Platform → Schema bezier */}
            <SvgEdge x1={abX+abW} y1={abCY} x2={schX} y2={cy} color={g.edge}/>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Source diagram (stream fan-out with spine) ───────────────────────────────

function SourceDiagram({ g, selId, onSelPipe, zoom=1 }: {
  g: ProviderGroup;
  selId: string|null;
  onSelPipe: (id:string)=>void;
  zoom?: number;
}) {
  const pipes = g.pipelines;
  const n = pipes.length;
  // Taller rows to fit the table layout: stream name + DB/Schema + tables
  const RH=80, RG=8, STEP=RH+RG, TOP=38, BOT=18;
  const SVG_H = TOP + n*STEP - RG + BOT;
  const SVG_W = 620;
  const srcX=6, srcW=76, srcH=44;
  const abX=92, abW=68, abH=44;
  const spX=abX+abW+10, cardX=spX+8;
  const cardW = SVG_W - cardX - 4;
  const half = cardW / 2;

  const rowY = pipes.map((_,i)=>TOP+i*STEP);
  const firstCY = rowY[0]+RH/2, lastCY = rowY[n-1]+RH/2;
  const centerY = (firstCY+lastCY)/2;

  return (
    <svg width={SVG_W*zoom} height={SVG_H*zoom} viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg"
      style={{overflow:"visible"}}>
      <SvgDefs colors={[g.edge]}/>

      <text x={srcX+srcW/2} y={20} textAnchor="middle" fontSize={9} fill="#94A3B8">Source API</text>
      <text x={abX+abW/2} y={20} textAnchor="middle" fontSize={9} fill="#94A3B8">Platform</text>
      <text x={cardX+cardW/2} y={20} textAnchor="middle" fontSize={9} fill="#94A3B8">Stream · Destination</text>

      {/* Source + Platform nodes, centered on all rows */}
      <SvgNode x={srcX} y={centerY-srcH/2} w={srcW} h={srcH}
        fill={g.fill} stroke={g.stroke} line1={g.display} line2="REST API"
        textColor={g.text} subColor="#94A3B8"/>
      <SvgNode x={abX} y={centerY-abH/2} w={abW} h={abH}
        fill={PLAT.fill} stroke={PLAT.stroke} line1={platMeta(g.platform).name} textColor={PLAT.text}/>

      {/* Source → Platform */}
      <line x1={srcX+srcW} y1={centerY} x2={abX} y2={centerY}
        stroke={g.edge} strokeWidth={1.5} strokeOpacity={0.65} markerEnd={arrId(g.edge)}/>
      {/* Platform → spine */}
      <line x1={abX+abW} y1={centerY} x2={spX} y2={centerY}
        stroke={g.edge} strokeWidth={1.5} strokeOpacity={0.65}/>

      {/* Vertical spine */}
      <line x1={spX} y1={firstCY} x2={spX} y2={lastCY}
        stroke="#CBD5E1" strokeWidth={0.75}/>

      {pipes.map((pipe, i) => {
        const ry=rowY[i], rcy=ry+RH/2;
        const entity=pipe.entities[0];
        const sl = entity ? clamp(streamLabel(entity), 28) : clamp(pipe.pipelineName, 28);
        const tc = pipe.entities.length;
        const tbl = entity ? `${tableLabel(entity)}${tc>1?` · +${tc-1} more`:""}` : "—";
        const db0 = entity ? dbLabel(entity) : "—";
        const sc0 = entity ? schemaLabel(entity) : "—";
        const isSel = pipe.catalogId === selId;

        // Card colours: selected uses the source accent; unselected uses the SF dark card style
        const cardFill  = isSel ? g.fill    : SF.rowBg;
        const cardStroke= isSel ? g.stroke  : SF.rowBorder;
        const nameColor = isSel ? g.text    : "#1E293B";
        const valColor  = isSel ? g.text    : SF.textColor;
        const lblColor  = isSel ? "#94A3B8" : SF.labelColor;
        const divColor  = isSel ? "#E2E8F0" : "#F1F5F9";

        return (
          <g key={pipe.catalogId} onClick={()=>onSelPipe(pipe.catalogId)} style={{cursor:"pointer"}}>
            {/* Spine → card arrow */}
            <line x1={spX} y1={rcy} x2={cardX} y2={rcy}
              stroke={g.edge} strokeWidth={1} strokeOpacity={0.6} markerEnd={arrId(g.edge)}/>

            {/* Unified stream + destination card */}
            <rect x={cardX} y={ry} width={cardW} height={RH} rx={5}
              fill={cardFill} stroke={cardStroke} strokeWidth={isSel?1:0.5}/>

            {/* Stream name */}
            <text x={cardX+10} y={ry+14} fontSize={10} fontWeight={600} fill={nameColor}
              style={{fontFamily:MONO}}>{sl}</text>

            {/* Divider 1 */}
            <line x1={cardX+1} y1={ry+21} x2={cardX+cardW-1} y2={ry+21}
              stroke={divColor} strokeWidth={0.5}/>

            {/* DATABASE / SCHEMA labels */}
            <text x={cardX+10} y={ry+30} fontSize={7.5} fill={lblColor} letterSpacing="0.05em">DATABASE</text>
            <text x={cardX+half+6} y={ry+30} fontSize={7.5} fill={lblColor} letterSpacing="0.05em">SCHEMA</text>

            {/* DB / Schema values */}
            <text x={cardX+10} y={ry+41} fontSize={8.5} fontWeight={500} fill={valColor}
              style={{fontFamily:MONO}}>{db0}</text>
            <text x={cardX+half+6} y={ry+41} fontSize={8.5} fontWeight={500} fill={valColor}
              style={{fontFamily:MONO}}>{sc0}</text>

            {/* Divider 2 */}
            <line x1={cardX+1} y1={ry+48} x2={cardX+cardW-1} y2={ry+48}
              stroke={divColor} strokeWidth={0.5}/>

            {/* Destination tables label */}
            <text x={cardX+10} y={ry+57} fontSize={7.5} fill={lblColor} letterSpacing="0.05em">
              {`DESTINATION TABLES (${tc})`}
            </text>

            {/* Table value */}
            <text x={cardX+10} y={ry+69} fontSize={8.5} fontWeight={500} fill={valColor}
              style={{fontFamily:MONO}}>{tbl}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Detail diagram (single pipeline: Source → Airbyte → stream card per entity) ──

function DetailDiagram({ pipe, g, zoom=1 }: { pipe:PipelineGroup; g:ProviderGroup; zoom?:number }) {
  const entities = pipe.entities.length > 0 ? pipe.entities : [null];
  const n = entities.length;
  const RH=80, RG=8, STEP=RH+RG, TOP=38, BOT=18;
  const SVG_H = TOP + n*STEP - RG + BOT;
  const SVG_W = 600;
  const srcX=6, srcW=76, srcH=44;
  const abX=92, abW=68, abH=44;
  const spX=abX+abW+10, cardX=spX+8;
  const cardW = SVG_W - cardX - 4;
  const half = cardW / 2;

  const rowY = entities.map((_,i)=>TOP+i*STEP);
  const firstCY = rowY[0]+RH/2, lastCY = rowY[n-1]+RH/2;
  const centerY = (firstCY+lastCY)/2;

  return (
    <svg width={SVG_W*zoom} height={SVG_H*zoom} viewBox={`0 0 ${SVG_W} ${SVG_H}`} xmlns="http://www.w3.org/2000/svg"
      style={{overflow:"visible"}}>
      <SvgDefs colors={[g.edge]}/>

      <text x={srcX+srcW/2} y={20} textAnchor="middle" fontSize={9} fill="#94A3B8">Source</text>
      <text x={abX+abW/2} y={20} textAnchor="middle" fontSize={9} fill="#94A3B8">Platform</text>
      <text x={cardX+cardW/2} y={20} textAnchor="middle" fontSize={9} fill="#94A3B8">Stream · Destination</text>

      {/* Source + Airbyte nodes, centered vertically */}
      <SvgNode x={srcX} y={centerY-srcH/2} w={srcW} h={srcH}
        fill={g.fill} stroke={g.stroke} line1={g.display} line2="REST API"
        textColor={g.text} subColor="#94A3B8"/>
      <SvgNode x={abX} y={centerY-abH/2} w={abW} h={abH}
        fill={PLAT.fill} stroke={PLAT.stroke} line1={platMeta(pipe.platform).name} textColor={PLAT.text}/>

      {/* Source → Airbyte */}
      <line x1={srcX+srcW} y1={centerY} x2={abX} y2={centerY}
        stroke={g.edge} strokeWidth={1.5} strokeOpacity={0.65} markerEnd={arrId(g.edge)}/>
      {/* Airbyte → spine */}
      <line x1={abX+abW} y1={centerY} x2={spX} y2={centerY}
        stroke={g.edge} strokeWidth={1.5} strokeOpacity={0.65}/>

      {/* Vertical spine */}
      {n > 1 && (
        <line x1={spX} y1={firstCY} x2={spX} y2={lastCY}
          stroke="#CBD5E1" strokeWidth={0.75}/>
      )}

      {entities.map((entity, i) => {
        const ry = rowY[i], rcy = ry+RH/2;
        const sl = entity ? clamp(streamLabel(entity), 28) : clamp(pipe.pipelineName, 28);
        const db0 = entity ? dbLabel(entity) : "—";
        const sc0 = entity ? schemaLabel(entity) : "—";
        const tbl = entity ? tableLabel(entity) : "—";

        return (
          <g key={i}>
            {/* Spine → card arrow */}
            <line x1={spX} y1={rcy} x2={cardX} y2={rcy}
              stroke={g.edge} strokeWidth={1} strokeOpacity={0.6} markerEnd={arrId(g.edge)}/>

            {/* Stream + destination unified card */}
            <rect x={cardX} y={ry} width={cardW} height={RH} rx={5}
              fill={g.fill} stroke={g.stroke} strokeWidth={1}/>

            <text x={cardX+10} y={ry+14} fontSize={10} fontWeight={600} fill={g.text}
              style={{fontFamily:MONO}}>{sl}</text>

            <line x1={cardX+1} y1={ry+21} x2={cardX+cardW-1} y2={ry+21}
              stroke="#CBD5E1" strokeWidth={0.5}/>

            <text x={cardX+10} y={ry+30} fontSize={7.5} fill="#94A3B8" letterSpacing="0.05em">DATABASE</text>
            <text x={cardX+half+6} y={ry+30} fontSize={7.5} fill="#94A3B8" letterSpacing="0.05em">SCHEMA</text>

            <text x={cardX+10} y={ry+41} fontSize={8.5} fontWeight={500} fill={g.text}
              style={{fontFamily:MONO}}>{db0}</text>
            <text x={cardX+half+6} y={ry+41} fontSize={8.5} fontWeight={500} fill={g.text}
              style={{fontFamily:MONO}}>{sc0}</text>

            <line x1={cardX+1} y1={ry+48} x2={cardX+cardW-1} y2={ry+48}
              stroke="#CBD5E1" strokeWidth={0.5}/>

            <text x={cardX+10} y={ry+57} fontSize={7.5} fill="#94A3B8" letterSpacing="0.05em">DESTINATION TABLE</text>
            <text x={cardX+10} y={ry+69} fontSize={8.5} fontWeight={500} fill={g.text}
              style={{fontFamily:MONO}}>{tbl}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Detail panel (bottom) ────────────────────────────────────────────────────

function DetailPanel({ pipe, g }: { pipe:PipelineGroup|null; g:ProviderGroup|null }) {
  const LABEL = "text-[9px] uppercase tracking-wider text-slate-400 mb-0.5";
  const VAL = "text-[11px] font-semibold text-slate-700";

  if (!pipe || !g) {
    return (
      <div className="border-t border-slate-200 px-5 py-5 text-center text-[11px] text-slate-400">
        Select a platform, source, or pipeline to trace its lineage
      </div>
    );
  }

  const entity = pipe.entities[0];
  const allTables = [...new Set(pipe.entities.map(e=>tableLabel(e)).filter(Boolean))];
  const allStreams = [...new Set(pipe.entities.map(e=>streamLabel(e)).filter(Boolean))];

  return (
    <div className="border-t border-slate-200 px-5 py-4">
      <p className="mb-0.5 text-xs font-semibold text-slate-800 break-all" style={{fontFamily:MONO}}>
        {pipe.pipelineName}
      </p>
      <p className="mb-3 text-[11px] text-slate-400">
        {pipe.entities.length} stream{pipe.entities.length!==1?"s":""} via {platMeta(pipe.platform).name}
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ["Platform", platMeta(pipe.platform).name],
          ["Source",   g.provider],
          ["Database", entity ? dbLabel(entity)     : "—"],
          ["Schema",   entity ? schemaLabel(entity)  : "—"],
        ] as [string,string][]).map(([lbl,val])=>(
          <div key={lbl} className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-200">
            <p className={LABEL}>{lbl}</p>
            <p className={VAL} style={{fontFamily:MONO}}>{val}</p>
          </div>
        ))}
      </div>

      {allStreams.length > 0 && (
        <div className="mb-2">
          <p className={LABEL}>Streams ({allStreams.length})</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {allStreams.map(s=>(
              <span key={s} className="rounded px-2 py-0.5 text-[10px] font-medium border"
                style={{background:g.fill, borderColor:g.stroke, color:g.text, fontFamily:MONO}}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {allTables.length > 0 && (
        <div>
          <p className={LABEL}>Destination tables ({allTables.length})</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {allTables.map(t=>(
              <span key={t} className="rounded px-2 py-0.5 text-[10px] font-medium border border-blue-200 text-blue-700"
                style={{background:"#EFF6FF", fontFamily:MONO}}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { records: EntityLineageRecord[]; query?: string; }

export function LineageGraph({ records, query="" }: Props) {
  const [expPlat, setExpPlat] = useState<Set<string>>(new Set());
  const [expSrc,  setExpSrc]  = useState<Set<string>>(new Set());
  const [selPlat, setSelPlat] = useState<string|null>(null);
  const [selSrc,  setSelSrc]  = useState<string|null>(null);
  const [selId,   setSelId]   = useState<string|null>(null);
  const [zoom,    setZoom]    = useState<number>(0.85);
  const ZOOM_STEP = 0.15, ZOOM_MIN = 0.4, ZOOM_MAX = 2.0;

  // Build 3-level hierarchy
  const platformGroups = useMemo<PlatformGroup[]>(() => {
    const platMap = new Map<string, Map<string, Map<string, PipelineGroup>>>();
    for (const r of records) {
      if (!platMap.has(r.platform)) platMap.set(r.platform, new Map());
      const provMap = platMap.get(r.platform)!;
      const prov = r.dataProvider ?? "Unknown";
      if (!provMap.has(prov)) provMap.set(prov, new Map());
      const pipeMap = provMap.get(prov)!;
      if (!pipeMap.has(r.catalogId))
        pipeMap.set(r.catalogId, { catalogId:r.catalogId, pipelineName:r.pipelineName,
          platform:r.platform, dataProvider:prov, entities:[] });
      pipeMap.get(r.catalogId)!.entities.push(r);
    }
    return [...platMap.entries()].map(([plat, provMap]) => {
      const meta = platMeta(plat);
      const providers: ProviderGroup[] = [...provMap.entries()].map(([prov, pipeMap], idx) => ({
        provider: prov,
        display: shortProvider(prov),
        platform: plat,
        pipelines: [...pipeMap.values()],
        ...palette(idx),
      }));
      return { platform:plat, name:meta.name, icon:meta.icon, providers };
    });
  }, [records]);

  // Sidebar items filtered by search
  const sidebarGroups = useMemo(() => {
    if (!query) return platformGroups;
    const q = query.toLowerCase();
    return platformGroups.map(pg => ({
      ...pg,
      providers: pg.providers.map(g => ({
        ...g,
        pipelines: g.pipelines.filter(p =>
          p.pipelineName.toLowerCase().includes(q) ||
          g.display.toLowerCase().includes(q) ||
          p.entities.some(e => streamLabel(e).toLowerCase().includes(q))
        ),
      })).filter(g => g.pipelines.length > 0),
    })).filter(pg => pg.providers.length > 0);
  }, [platformGroups, query]);

  // Resolve current selections to objects
  const curPlatGroup = selPlat ? platformGroups.find(pg=>pg.platform===selPlat) ?? null : null;
  const curProvGroup: ProviderGroup | null = selSrc
    ? platformGroups.flatMap(pg=>pg.providers).find(g=>g.provider===selSrc) ?? null
    : selId
    ? platformGroups.flatMap(pg=>pg.providers).find(g=>g.pipelines.some(p=>p.catalogId===selId)) ?? null
    : null;
  const curPipe = selId ? curProvGroup?.pipelines.find(p=>p.catalogId===selId) ?? null : null;

  // Stats
  const totalPlatforms = platformGroups.length;
  const totalProviders = platformGroups.reduce((s,pg)=>s+pg.providers.length,0);
  const totalPipelines = platformGroups.reduce((s,pg)=>pg.providers.reduce((ss,g)=>ss+g.pipelines.length,s),0);

  // Diagram mode
  const mode = selId ? "detail" : selSrc ? "source" : selPlat ? "platform" : "overview";

  const diagLabel = mode==="detail"   ? `Lineage · ${curPipe?.pipelineName??""}`
    : mode==="source"  ? `Source lineage · ${shortProvider(selSrc??"")}`
    : mode==="platform"? `Platform lineage · ${curPlatGroup?.name??""}`
    : "Overview — all pipelines";

  const diagNote = mode==="detail"
    ? `${shortProvider(curProvGroup?.provider??"")} → ${platMeta(curPipe?.platform??"").name} → ${curPipe?.entities[0]?schemaLabel(curPipe.entities[0]):"—"}`
    : mode==="source"
    ? `${curProvGroup?.provider??""} → ${platMeta(curProvGroup?.platform??"").name} → ${curProvGroup?providerSchemas(curProvGroup):"—"}`
    : mode==="platform"
    ? `All sources → ${curPlatGroup?.name??""} → CuraProd Snowflake`
    : platformGroups.map(pg=>pg.name).join(", ") + " → CuraProd Snowflake";

  const hasSelection = !!(selPlat||selSrc||selId);

  // ── Actions ──
  function doSelPlat(plat: string) {
    setSelPlat(plat); setSelSrc(null); setSelId(null);
    setExpPlat(prev=>{ const s=new Set(prev); s.add(plat); return s; });
    // Also expand all sources + pipelines under this platform
    const pg = platformGroups.find(p => p.platform === plat);
    if (pg) {
      setExpSrc(prev => {
        const s = new Set(prev);
        pg.providers.forEach(g => s.add(g.provider));
        return s;
      });
    }
  }
  function doSelSrc(prov: string, plat: string) {
    setSelSrc(prov); setSelPlat(null); setSelId(null);
    setExpPlat(prev=>{ const s=new Set(prev); s.add(plat); return s; });
    setExpSrc(prev=>{ const s=new Set(prev); s.add(prov); return s; });
  }
  function doSelPipe(catalogId: string, prov: string, plat: string) {
    setSelId(catalogId); setSelSrc(null); setSelPlat(null);
    setExpPlat(prev=>{ const s=new Set(prev); s.add(plat); return s; });
    setExpSrc(prev=>{ const s=new Set(prev); s.add(prov); return s; });
  }
  function clearAll() {
    setSelPlat(null); setSelSrc(null); setSelId(null);
    setExpSrc(new Set());
  }
  function togglePlat(plat: string) {
    setExpPlat(prev=>{ const s=new Set(prev); s.has(plat)?s.delete(plat):s.add(plat); return s; });
  }
  function toggleSrc(prov: string) {
    setExpSrc(prev=>{ const s=new Set(prev); s.has(prov)?s.delete(prov):s.add(prov); return s; });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-slate-400">Curaleaf</span>
        <span className="text-slate-300">·</span>
        <span className="text-[13px] font-medium text-slate-700">Data Lineage Catalog</span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] text-slate-400"><b className="font-medium text-slate-600">{totalPlatforms}</b> platform{totalPlatforms!==1?"s":""}</span>
        <span className="text-[11px] text-slate-400"><b className="font-medium text-slate-600">{totalProviders}</b> sources</span>
        <span className="text-[11px] text-slate-400"><b className="font-medium text-slate-600">{totalPipelines}</b> pipelines</span>
        <div className="ml-auto flex items-center gap-2">
          {hasSelection && (
            <button type="button" onClick={clearAll}
              className="rounded border border-slate-300 px-3 py-1 text-[10px] text-slate-500 hover:text-slate-700 hover:border-slate-400 transition-colors">
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex" style={{minHeight:520}}>

        {/* Sidebar */}
        <aside className="w-48 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50"
          style={{maxHeight:640}}>

          {sidebarGroups.length === 0 && (
            <p className="px-4 py-6 text-center text-[11px] text-slate-400">No pipelines match</p>
          )}

          {sidebarGroups.map(pg => {
            const isPlatEx = expPlat.has(pg.platform) || !!query;
            const isPlatSel = selPlat === pg.platform;
            return (
              <div key={pg.platform}>
                {/* Platform row */}
                <div className={`flex select-none items-center border-b border-slate-200 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 ${isPlatSel?"bg-slate-100":""}`}>
                  {/* Expand/collapse toggle — independent from selection */}
                  <button type="button"
                    onClick={e=>{ e.stopPropagation(); togglePlat(pg.platform); }}
                    className="flex h-full flex-shrink-0 cursor-pointer items-center justify-center px-2 py-[7px] text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                    title={isPlatEx?"Collapse":"Expand"}>
                    {isPlatEx ? "−" : "+"}
                  </button>
                  {/* Platform label — clicking selects and also expands */}
                  <div className="flex flex-1 cursor-pointer items-center gap-1.5 overflow-hidden py-[7px] pr-2.5"
                    onClick={()=>{ doSelPlat(pg.platform); }}>
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border border-slate-300 bg-white text-[9px] font-medium text-slate-500"
                      style={{fontFamily:MONO}}>
                      {pg.icon}
                    </span>
                    <span className="flex-1 truncate">{pg.name}</span>
                    <span className="flex-shrink-0 rounded px-1.5 py-px text-[10px] text-slate-400 bg-slate-200">
                      {pg.providers.reduce((s,g)=>s+g.pipelines.length,0)}
                    </span>
                  </div>
                </div>

                {isPlatEx && pg.providers.map(g => {
                  const isSrcEx  = expSrc.has(g.provider) || !!query;
                  const isSrcSel = selSrc === g.provider;
                  return (
                    <div key={g.provider}>
                      {/* Source row */}
                      <div
                        className={`flex cursor-pointer select-none items-center gap-1.5 border-b border-slate-100 py-[5px] pl-6 pr-2.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-100 ${isSrcSel?"bg-slate-100 text-slate-700":""}`}
                        onClick={()=>{ doSelSrc(g.provider, pg.platform); toggleSrc(g.provider); }}>
                        <span className="h-[5px] w-[5px] flex-shrink-0 rounded-full" style={{background:g.stroke}}/>
                        <span className="flex-1 truncate">{g.display}</span>
                        <span className="flex-shrink-0 rounded px-1 py-px text-[9px] text-slate-400 bg-slate-200">
                          {g.pipelines.length}
                        </span>
                        <span className="text-[8px] text-slate-400">{isSrcEx?"▾":"▸"}</span>
                      </div>

                      {/* Pipeline items */}
                      {isSrcEx && g.pipelines.map(pipe=>{
                        const isSel = selId === pipe.catalogId;
                        return (
                          <div key={pipe.catalogId}
                            className={`flex cursor-pointer items-center gap-1 border-b border-slate-100 py-[3px] pl-9 pr-2.5 transition-colors hover:bg-slate-100 ${isSel?"bg-slate-100":""}`}
                            onClick={()=>doSelPipe(pipe.catalogId, g.provider, pg.platform)}>
                            <span className="min-w-0 flex-1 truncate text-[10px] text-slate-500"
                              style={{fontFamily:MONO}} title={pipe.pipelineName}>
                              {pipe.pipelineName}
                            </span>
                            <span className="flex-shrink-0 rounded px-1 py-px text-[9px] text-slate-400 bg-slate-200">
                              {pipe.entities.length}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Diagram header */}
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-[7px]">
            <span className="text-[11px] font-medium text-slate-600">{diagLabel}</span>
            <span className="text-[10px] text-slate-400" style={{fontFamily:MONO}}>{diagNote}</span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button"
                onClick={()=>setZoom(z=>Math.max(ZOOM_MIN, +(z-ZOOM_STEP).toFixed(2)))}
                className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-[12px] text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
                title="Zoom out">−</button>
              <button type="button"
                onClick={()=>setZoom(1.0)}
                className="rounded border border-slate-300 px-1.5 py-px text-[9px] text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
                style={{fontFamily:MONO}} title="Reset zoom">{Math.round(zoom*100)}%</button>
              <button type="button"
                onClick={()=>setZoom(z=>Math.min(ZOOM_MAX, +(z+ZOOM_STEP).toFixed(2)))}
                className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-[12px] text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
                title="Zoom in">+</button>
            </div>
          </div>

          {/* SVG diagram */}
          <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
            {mode==="overview" && (
              <OverviewDiagram platformGroups={platformGroups} onSelPlat={doSelPlat} zoom={zoom}/>
            )}
            {mode==="platform" && curPlatGroup && (
              <PlatformDiagram pg={curPlatGroup} onSelProvider={prov=>doSelSrc(prov, curPlatGroup.platform)} zoom={zoom}/>
            )}
            {mode==="source" && curProvGroup && (
              <SourceDiagram g={curProvGroup} selId={selId}
                onSelPipe={id=>doSelPipe(id, curProvGroup.provider, curProvGroup.platform)} zoom={zoom}/>
            )}
            {mode==="detail" && curPipe && curProvGroup && (
              <DetailDiagram pipe={curPipe} g={curProvGroup} zoom={zoom}/>
            )}
          </div>

          {/* Detail panel */}
          <DetailPanel pipe={curPipe} g={curProvGroup}/>
        </main>
      </div>
    </div>
  );
}
