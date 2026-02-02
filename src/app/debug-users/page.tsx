import { listUsers } from "@/actions/debug-users";

export default async function DebugPage() {
    const users = await listUsers();

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">Auth Users Debug</h1>
            <pre>{JSON.stringify(users, null, 2)}</pre>
        </div>
    );
}
