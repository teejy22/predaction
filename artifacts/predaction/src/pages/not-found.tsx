import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Flag on the play</p>
      <h1 className="mt-2 text-[8rem] font-extrabold leading-none tracking-[-.09em]">404</h1>
      <p className="text-muted-foreground">This page is out of bounds.</p>
      <Link href="/" data-testid="link-404-home" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
        Back to the board
      </Link>
    </div>
  );
}
