import PageShell from "../components/ui/PageShell";

export default function ProfilePage({ user }) {
  return (
    <div className="max-w-6xl">
      <PageShell title="Profile" subtitle="Account information and preferences">
        <div className="card-elev rounded-xl p-5 max-w-2xl">
          <p className="text-sm text-[var(--text-secondary)]"><strong>Name:</strong> {user?.name}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1"><strong>Email:</strong> {user?.email}</p>
          <p className="text-sm text-[var(--text-secondary)] mt-1"><strong>Role:</strong> {user?.role}</p>
        </div>
      </PageShell>
    </div>
  );
}