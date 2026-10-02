import { Link } from "@tanstack/react-router";

import { Logo } from "./Logo";

export function Footer({ instagram, address }: { instagram?: string; address?: string }) {
  return (
    <footer className="border-t border-border/70 bg-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-14 text-center">
        <Logo className="h-24" />
        <span className="gold-rule w-40" aria-hidden="true" />
        <nav className="flex flex-wrap justify-center gap-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" hash="servicos" className="hover:text-gold">
            Serviços
          </Link>
          <Link to="/" hash="sobre" className="hover:text-gold">
            Sobre
          </Link>
          <Link to="/" hash="contato" className="hover:text-gold">
            Contato
          </Link>
          <Link to="/agendar" className="hover:text-gold">
            Agendar
          </Link>
          <Link to="/admin" className="hover:text-gold">
            Área da equipe
          </Link>
        </nav>
        {address ? <p className="max-w-sm text-sm text-muted-foreground">{address}</p> : null}
        {instagram ? (
          <a
            href={`https://instagram.com/${instagram.replace("@", "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-gold hover:underline"
          >
            {instagram}
          </a>
        ) : null}
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Janaína Cunha Studio. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
