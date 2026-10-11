import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso da equipe — Janaína Cunha Studio" },
      { name: "description", content: "Área restrita da equipe do Janaína Cunha Studio." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Acesso da equipe — Janaína Cunha Studio" },
      { property: "og:description", content: "Área restrita da equipe do studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const msg = sessionStorage.getItem("auth_notice");
    if (msg) {
      sessionStorage.removeItem("auth_notice");
      setNotice(msg);
      toast.error(msg);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email) {
      toast.error("Digite seu e-mail acima para receber o link.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo className="h-32" />
        </div>
        <div className="mt-10 border border-border bg-card p-8">
          <h1 className="text-center text-2xl">Acesso da equipe</h1>
          <span className="gold-rule mx-auto mt-4 w-20" aria-hidden="true" />
          {notice ? <p className="mt-6 text-center text-sm text-destructive">{notice}</p> : null}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 rounded-none" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 rounded-none"
              />
            </div>
            <Button type="submit" className="w-full rounded-none uppercase tracking-[0.15em]" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
          <button
            type="button"
            onClick={handleForgot}
            className="mt-6 w-full text-center text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
    </div>
  );
}
