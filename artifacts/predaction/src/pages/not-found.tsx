import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Flag on the play</p>
      <h1 className="mt-2 font-display text-[9rem] font-black leading-none">404</h1>
      <p className="text-muted-foreground">This page is out of bounds.</p>
      <Link href="/" data-testid="link-404-home" className="mt-6 inline-block rounded-md border-2 border-foreground bg-accent px-4 py-2 text-sm font-bold uppercase transition-transform hover:-translate-y-0.5">
        Back to the board
      </Link>
    </div>
  );
}
