import { useEffect, useState } from "react";
import api from "../api/client";
import { resolveAssetUrl } from "../utils/urls";
import { useAuth } from "../context/AuthContext";

const types = [
  { value: "bug", label: "Raise Bug / Issue" },
  { value: "enhancement", label: "Enhancement Request" },
  { value: "new_project", label: "New Project Request" },
  { value: "service", label: "Service Request" }
];

export default function SupportPanel({ open, onClose }) {
  const { user } = useAuth();
  const [ticketType, setTicketType] = useState("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState("");
  const isAdmin = user?.role === "admin";

  const loadTickets = async () => {
    const { data } = await api.get("/support/tickets");
    setTickets(data);
  };

  useEffect(() => {
    if (open) loadTickets();
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    const fd = new FormData();
    fd.append("ticketType", ticketType);
    fd.append("title", title);
    fd.append("description", description);
    [...attachments].forEach((file) => fd.append("attachments", file));
    await api.post("/support/tickets", fd);
    setTitle("");
    setDescription("");
    setAttachments([]);
    setMessage("Ticket submitted.");
    loadTickets();
  };

  const decide = async (id, decision) => {
    await api.patch(`/support/tickets/${id}/decision`, { decision });
    loadTickets();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full md:w-[560px] h-full bg-white dark:bg-slate-800 p-5 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-root">Customer Service Panel</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <select className="w-full p-3 rounded border" value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
            {types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <input className="w-full p-3 rounded border" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          <textarea className="w-full p-3 rounded border" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="w-full p-3 rounded border"
            onChange={(e) => setAttachments(e.target.files || [])}
          />
          <p className="text-xs text-slate-500">Attach images/docs (max 5 files, 8MB each).</p>
          {message && <p className="text-xs text-emerald-600">{message}</p>}
          <button className="bg-root text-white px-4 py-2 rounded">Submit</button>
        </form>
        <h3 className="font-semibold mt-8">Tracking</h3>
        <div className="space-y-2 mt-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded border border-slate-200 dark:border-slate-700 p-3">
              <p className="font-medium">{ticket.title}</p>
              <p className="text-sm text-slate-500">{ticket.ticket_type} - {ticket.status}</p>
              <p className="text-xs mt-1">
                Decision:{" "}
                <span className={`font-medium ${
                  ticket.decision_status === "accepted"
                    ? "text-emerald-600"
                    : ticket.decision_status === "declined"
                      ? "text-rose-600"
                      : "text-amber-600"
                }`}>
                  {ticket.decision_status || "pending"}
                </span>
              </p>
              {ticket.decision_note && <p className="text-xs mt-1 text-slate-500">{ticket.decision_note}</p>}
              {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {ticket.attachments.map((a, idx) => (
                    <a
                      key={`${ticket.id}-${idx}`}
                      href={resolveAssetUrl(a.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    >
                      {a.name}
                    </a>
                  ))}
                </div>
              )}
              {isAdmin && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded text-xs bg-emerald-600 text-white"
                    onClick={() => decide(ticket.id, "accepted")}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded text-xs bg-rose-600 text-white"
                    onClick={() => decide(ticket.id, "declined")}
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
