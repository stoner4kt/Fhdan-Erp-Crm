// ============================================================
// CLIENTS TABLE COMPONENT
// ============================================================
"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus, Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn, formatDate, capitalize } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ClientsTableProps {
  clients: any[];
  total: number;
  page: number;
  perPage: number;
  canCreate: boolean;
  searchQuery: string;
}

const CLIENT_TYPE_COLORS: Record<string, string> = {
  individual: "bg-blue-100 text-blue-700",
  corporate: "bg-purple-100 text-purple-700",
  government: "bg-green-100 text-green-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  blacklisted: "bg-red-100 text-red-700",
};

export function ClientsTable({ clients, total, page, perPage, canCreate, searchQuery }: ClientsTableProps) {
  const [search, setSearch] = useState(searchQuery);
  const router = useRouter();
  const totalPages = Math.ceil(total / perPage);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/clients?q=${encodeURIComponent(search)}&page=1`);
  }

  return (
    <div className="page-container space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border bg-card focus:outline-none focus:ring-2 focus:ring-brand-500 w-64"
            />
          </div>
          <button type="submit" className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/80 transition-colors">
            Search
          </button>
        </form>
        {canCreate && (
          <Link
            href="/bookings/new"
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Link>
        )}
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        {clients.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {searchQuery ? `No clients matching "${searchQuery}"` : "No clients yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {["Name / Company", "Email", "Phone", "Type", "Currency", "Status", "Since", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="font-semibold truncate max-w-[180px]">{client.full_name}</p>
                      {client.company_name && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{client.company_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[160px]">
                      {client.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {client.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge text-[10px]", CLIENT_TYPE_COLORS[client.client_type])}>
                        {capitalize(client.client_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-medium">
                      {client.preferred_currency}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge text-[10px]", STATUS_COLORS[client.status])}>
                        {capitalize(client.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex gap-1">
            {page > 1 && (
              <Link href={`/clients?q=${searchQuery}&page=${page - 1}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs hover:bg-muted transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/clients?q=${searchQuery}&page=${page + 1}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs hover:bg-muted transition-colors">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
