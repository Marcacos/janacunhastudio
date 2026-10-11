import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Janaína Cunha Studio" },
      { name: "description", content: "Defina uma nova senha para o acesso da equipe." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Redefinir senha — Janaína Cunha Studio" },
      { property: "og:description", content: "Defina uma nova senha para o acesso da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível redefinir. Abra novamente o link enviado por e-mail.");
      return;
    }
    toast.success("Senha alterada com sucesso.");
    navigate({ to: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo className="h-32" />
        </div>
        <div className="mt-10 border border-border bg-card p-8">
          <h1 className="text-center text-2xl">Nova senha</h1>
          <span className="gold-rule mx-auto mt-4 w-20" aria-hidden="true" />
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 rounded-none" />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 rounded-none" />
            </div>
            <Button type="submit" className="w-full rounded-none uppercase tracking-[0.15em]" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
