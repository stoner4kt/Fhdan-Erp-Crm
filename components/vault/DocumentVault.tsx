// ============================================================
// DOCUMENT VAULT COMPONENT — POPIA-compliant encrypted vault
// AES-256 encrypted storage, signed URLs that expire in 60min
// ============================================================
"use client";

import { useState, useRef } from "react";
import {
  ShieldCheck, Upload, Eye, Download, Trash2, FileText,
  Lock, AlertCircle, CheckCircle2, Loader2, Clock,
} from "lucide-react";
import { cn, formatFileSize, formatDate, formatRelative } from "@/lib/utils";
import type { VaultDocument, DocumentType } from "@/types";

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  passport: "Passport",
  rsa_id: "RSA ID Document",
  drivers_license: "Driver's Licence",
  pdp: "PDP Certificate",
  vehicle_registration: "Vehicle Registration",
  insurance: "Insurance Certificate",
  roadworthy: "Roadworthy Certificate",
  other: "Other Document",
};

const DOC_TYPE_ICONS: Record<string, string> = {
  passport: "🛂",
  rsa_id: "🪪",
  drivers_license: "🪪",
  pdp: "📋",
  vehicle_registration: "📄",
  insurance: "🛡️",
  roadworthy: "🔧",
  other: "📎",
};

interface DocumentVaultProps {
  documents: VaultDocument[];
  canUpload: boolean;
  canDownload: boolean;
  canDelete: boolean;
  userId: string;
}

export function DocumentVault({
  documents,
  canUpload,
  canDownload,
  canDelete,
  userId,
}: DocumentVaultProps) {
  const [filter, setFilter] = useState<DocumentType | "all">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload form state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    entity_type: "client" as "client" | "driver" | "vehicle",
    entity_id: "",
    document_type: "passport" as DocumentType,
    expiry_date: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = documents.filter(
    (d) => filter === "all" || d.document_type === filter
  );

  // ----------------------------
  // GET SIGNED URL (60 min expiry)
  // ----------------------------
  async function getSignedUrl(doc: VaultDocument) {
    if (signedUrls[doc.id]) {
      window.open(signedUrls[doc.id], "_blank");
      return;
    }
    setLoadingUrl(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/signed-url`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSignedUrls((prev) => ({ ...prev, [doc.id]: data.url }));
      window.open(data.url, "_blank");
    } catch (err: any) {
      alert(`Could not get document URL: ${err.message}`);
    } finally {
      setLoadingUrl(null);
    }
  }

  // ----------------------------
  // UPLOAD
  // ----------------------------
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", uploadForm.entity_type);
      formData.append("entity_id", uploadForm.entity_id);
      formData.append("document_type", uploadForm.document_type);
      formData.append("expiry_date", uploadForm.expiry_date);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowUpload(false);
      window.location.reload();
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // ----------------------------
  // DELETE
  // ----------------------------
  async function handleDelete(docId: string) {
    if (!confirm("Delete this document? This action is logged and cannot be undone.")) return;
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      window.location.reload();
    } catch {
      alert("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-container space-y-5">
      {/* POPIA notice banner */}
      <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <Lock className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-yellow-800">POPIA Restricted Access Zone</p>
          <p className="text-xs text-yellow-700 mt-0.5">
            All documents in this vault contain personally identifiable information (PII).
            Access is restricted by role. Every view and download is permanently audit-logged.
            Signed download URLs expire after 60 minutes.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {["all", "passport", "rsa_id", "drivers_license", "pdp", "vehicle_registration", "insurance", "roadworthy", "other"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t as any)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === t
                  ? "bg-brand-500 text-white"
                  : "bg-card border text-muted-foreground hover:border-brand-300"
              )}
            >
              {t === "all" ? `All (${documents.length})` : DOC_TYPE_LABELS[t as DocumentType]}
            </button>
          ))}
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-sm shrink-0"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        )}
      </div>

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} className="card-base p-5 space-y-4 animate-fade-in border-brand-200">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand-500" />
            Upload Encrypted Document
          </h3>
          {uploadError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {uploadError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Entity Type *</label>
              <select value={uploadForm.entity_type} onChange={(e) => setUploadForm((p) => ({ ...p, entity_type: e.target.value as any }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="client">Client</option>
                <option value="driver">Driver</option>
                <option value="vehicle">Vehicle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Entity ID *</label>
              <input required value={uploadForm.entity_id} onChange={(e) => setUploadForm((p) => ({ ...p, entity_id: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="UUID of client/driver/vehicle" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Document Type *</label>
              <select value={uploadForm.document_type} onChange={(e) => setUploadForm((p) => ({ ...p, document_type: e.target.value as DocumentType }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Expiry Date (if applicable)</label>
              <input type="date" value={uploadForm.expiry_date} onChange={(e) => setUploadForm((p) => ({ ...p, expiry_date: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">File (PDF, JPG, PNG — max 10MB) *</label>
              <input ref={fileInputRef} required type="file" accept=".pdf,.jpg,.jpeg,.png"
                className="w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Encrypting & Uploading..." : "Upload to Vault"}
            </button>
            <button type="button" onClick={() => setShowUpload(false)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-muted transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <div className="card-base p-12 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No documents in vault{filter !== "all" ? ` for type "${DOC_TYPE_LABELS[filter as DocumentType]}"` : ""}.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <VaultDocCard
              key={doc.id}
              doc={doc}
              canDownload={canDownload}
              canDelete={canDelete}
              isLoadingUrl={loadingUrl === doc.id}
              isDeleting={deletingId === doc.id}
              onView={() => getSignedUrl(doc)}
              onDelete={() => handleDelete(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VaultDocCard({
  doc, canDownload, canDelete, isLoadingUrl, isDeleting, onView, onDelete,
}: {
  doc: VaultDocument;
  canDownload: boolean;
  canDelete: boolean;
  isLoadingUrl: boolean;
  isDeleting: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  const isExpiringSoon = doc.expiry_date &&
    Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / 86400000) <= 30;
  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

  return (
    <div className={cn(
      "card-base p-4 space-y-3",
      isExpired && "border-red-200",
      isExpiringSoon && !isExpired && "border-yellow-200"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{DOC_TYPE_ICONS[doc.document_type] ?? "📎"}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{DOC_TYPE_LABELS[doc.document_type]}</p>
            <p className="text-[10px] text-muted-foreground">
              {doc.entity_type.charAt(0).toUpperCase() + doc.entity_type.slice(1)}
            </p>
          </div>
        </div>
        <Lock className="h-4 w-4 text-brand-500 shrink-0" />
      </div>

      {/* File info */}
      <div className="space-y-1">
        <p className="text-xs font-medium truncate" title={doc.file_name}>{doc.file_name}</p>
        <p className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size_bytes)}</p>
      </div>

      {/* Expiry */}
      {doc.expiry_date && (
        <div className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]",
          isExpired ? "bg-red-50 text-red-700" : isExpiringSoon ? "bg-yellow-50 text-yellow-700" : "bg-muted text-muted-foreground"
        )}>
          <Clock className="h-3 w-3 shrink-0" />
          {isExpired ? "Expired" : "Expires"}: {formatDate(doc.expiry_date)}
        </div>
      )}

      {/* Verification */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {doc.is_verified ? (
          <><CheckCircle2 className="h-3 w-3 text-green-500" /> Verified</>
        ) : (
          <><AlertCircle className="h-3 w-3 text-yellow-500" /> Not verified</>
        )}
        <span className="ml-auto">{formatRelative(doc.created_at)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {canDownload && (
          <button
            onClick={onView}
            disabled={isLoadingUrl}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-50 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60 transition-colors"
          >
            {isLoadingUrl ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {isLoadingUrl ? "Getting URL..." : "View (60 min)"}
          </button>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
