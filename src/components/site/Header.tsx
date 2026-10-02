import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { label: "Início", hash: "inicio" },
  { label: "Serviços", hash: "servicos" },
  { label: "Sobre", hash: "sobre" },
  { label: "Espaço", hash: "espaco" },
  { label: "Contato", hash: "contato" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <Link to="/" hash="inicio" aria-label="Janaína Cunha Studio — início">
          <Logo className="h-12 md:h-14" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          {NAV.map((item) => (
            <Link
              key={item.hash}
              to="/"
              hash={item.hash}
              className="text-sm font-medium uppercase tracking-[0.15em] text-foreground/80 transition-colors hover:text-gold-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden rounded-none px-6 tracking-[0.15em] uppercase md:inline-flex">
            <Link to="/agendar">Agendar horário</Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="mt-10 flex flex-col gap-6" aria-label="Navegação móvel">
                {NAV.map((item) => (
                  <Link
                    key={item.hash}
                    to="/"
                    hash={item.hash}
                    onClick={() => setOpen(false)}
                    className="text-sm uppercase tracking-[0.2em] text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-4 rounded-none uppercase tracking-[0.15em]">
                  <Link to="/agendar" onClick={() => setOpen(false)}>
                    Agendar horário
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
