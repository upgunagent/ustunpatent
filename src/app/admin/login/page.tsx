import { login } from "./actions";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm overflow-hidden rounded-lg border bg-background shadow-lg">
                <div className="p-6 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your credentials to access the panel
                    </p>
                </div>
                <div className="p-6 pt-0">
                    <form className="grid gap-4">
                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium leading-none">
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium leading-none"
                                >
                                    Password
                                </label>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <button
                            formAction={login}
                            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        >
                            Sign in
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
