import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme o e-mail enviado para entrar.");
          setMode("login");
          return;
        }
        await supabase.rpc("claim_first_admin");
        navigate({ to: "/admin" });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await supabase.rpc("claim_first_admin");
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo className="h-32" />
        </div>
        <div className="mt-10 border border-border bg-card p-8">
          <h1 className="text-center text-2xl">{mode === "login" ? "Acesso da equipe" : "Criar acesso"}</h1>
          <span className="gold-rule mx-auto mt-4 w-20" aria-hidden="true" />
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 rounded-none"
              />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 rounded-none"
              />
            </div>
            <Button type="submit" className="w-full rounded-none uppercase tracking-[0.15em]" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 w-full text-center text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold"
          >
            {mode === "login" ? "Criar primeiro acesso" : "Já tenho conta"}
          </button>
        </div>
      </div>
    </div>
  );
}
