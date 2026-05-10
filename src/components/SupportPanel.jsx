import { useEffect, useState } from "react";
import api from "../api/client";

const types = [
  { value: "bug", label: "Raise Bug / Issue" },
  { value: "enhancement", label: "Enhancement Request" },
  { value: "new_project", label: "New Project Request" },
  { value: "service", label: "Service Request" }
];

export default function SupportPanel({ open, onClose }) {
  const [ticketType, setTicketType] = useState("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tickets, setTickets] = useState([]);

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
    await api.post("/support/tickets", { ticketType, title, description });
    setTitle("");
    setDescription("");
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
          <button className="bg-root text-white px-4 py-2 rounded">Submit</button>
        </form>
        <h3 className="font-semibold mt-8">Tracking</h3>
        <div className="space-y-2 mt-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded border border-slate-200 dark:border-slate-700 p-3">
              <p className="font-medium">{ticket.title}</p>
              <p className="text-sm text-slate-500">{ticket.ticket_type} - {ticket.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
