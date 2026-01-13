import { LucideLayoutDashboard } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <LucideLayoutDashboard size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          UstunPatent CRM
        </h1>
        <p className="text-muted-foreground">
          Initializing the next generation workspace...
        </p>
      </div>
    </div>
  );
}
