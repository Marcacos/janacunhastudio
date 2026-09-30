import { MessageCircle } from "lucide-react";

import { whatsappLink } from "@/lib/format";

export function WhatsAppFloat({ number }: { number?: string }) {
  if (!number) return null;
  return (
    <a
      href={whatsappLink(number, "Olá! Gostaria de mais informações sobre os serviços do studio.")}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-gold text-primary-foreground shadow-lg transition-transform hover:scale-105 md:hidden"
    >
      <MessageCircle className="size-6" />
    </a>
  );
}
