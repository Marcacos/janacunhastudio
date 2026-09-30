import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle, Instagram } from "lucide-react";

import espaco from "@/assets/espaco.jpg.asset.json";
import janaina from "@/assets/janaina.jpg.asset.json";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { Button } from "@/components/ui/button";
import { businessHoursQuery, servicesQuery, settingsQuery } from "@/lib/api";
import { WEEKDAY_LABELS, formatDuration, formatPrice, formatTime, whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Janaína Cunha Studio — Salão de beleza de alto padrão" },
      {
        name: "description",
        content:
          "Cabelo, unhas e sobrancelhas com cuidado artesanal no Janaína Cunha Studio. Agende seu horário online em poucos toques.",
      },
      { property: "og:title", content: "Janaína Cunha Studio" },
      {
        property: "og:description",
        content: "Beleza com cuidado artesanal. Agende seu horário online no Janaína Cunha Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BeautySalon",
          name: "Janaína Cunha Studio",
          description: "Salão de beleza de alto padrão com agendamento online.",
          priceRange: "$$",
        }),
      },
    ],
  }),
  component: Home,
});

const TESTIMONIALS = [
  {
    name: "[PLACEHOLDER] Cliente 1",
    text: "[PLACEHOLDER] Saio sempre me sentindo renovada. O cuidado com cada detalhe faz toda a diferença.",
  },
  {
    name: "[PLACEHOLDER] Cliente 2",
    text: "[PLACEHOLDER] Atendimento acolhedor e resultado impecável. Encontrei meu lugar de confiança.",
  },
  {
    name: "[PLACEHOLDER] Cliente 3",
    text: "[PLACEHOLDER] O espaço é lindo e a equipe entende exatamente o que eu quero no cabelo.",
  },
];

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 px-5 py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Home() {
  const { data: services } = useQuery(servicesQuery());
  const { data: settings } = useQuery(settingsQuery());
  const { data: hours } = useQuery(businessHoursQuery());

  const whatsapp = settings?.whatsapp ?? "";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <WhatsAppFloat number={whatsapp} />

      <main className="pt-20">
        {/* HERO */}
        <Section id="inicio" className="bg-cream">
          <div className="fade-up mx-auto max-w-2xl text-center">
            <p className="eyebrow">Beleza & cuidado</p>
            <h1 className="mt-6 text-4xl leading-tight text-foreground md:text-6xl">
              Onde o cuidado encontra a sua beleza natural
            </h1>
            <span className="gold-rule mx-auto mt-8 w-32" aria-hidden="true" />
            <p className="mt-8 text-base leading-relaxed text-muted-foreground md:text-lg">
              Um studio pensado para o seu tempo: atendimento próximo, técnicas precisas e produtos
              escolhidos com carinho para realçar quem você já é.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full rounded-none uppercase tracking-[0.15em] sm:w-auto">
                <Link to="/agendar">Agendar horário</Link>
              </Button>
              {whatsapp ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full rounded-none uppercase tracking-[0.15em] sm:w-auto"
                >
                  <a href={whatsappLink(whatsapp, "Olá! Gostaria de agendar um horário.")} target="_blank" rel="noreferrer">
                    Falar no WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </Section>

        {/* SERVIÇOS */}
        <Section id="servicos">
          <div className="text-center">
            <p className="eyebrow">Serviços</p>
            <h2 className="mt-4 text-3xl md:text-4xl">Cuidados sob medida</h2>
            <span className="gold-rule mx-auto mt-6 w-24" aria-hidden="true" />
          </div>
          <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {(services ?? []).map((service) => (
              <article key={service.id} className="flex flex-col gap-3 bg-card p-8">
                <h3 className="text-2xl">{service.name}</h3>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-4 text-sm">
                  <span className="text-muted-foreground">{formatDuration(service.duration_minutes)}</span>
                  <span className="text-gold">{formatPrice(service.price_cents)}</span>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* SOBRE */}
        <Section id="sobre" className="bg-cream">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <img
              src={janaina.url}
              alt="Janaína Cunha no studio"
              loading="lazy"
              className="aspect-[3/4] w-full rounded-sm object-cover object-top shadow-sm"
            />
            <div>
              <p className="eyebrow">Sobre</p>
              <h2 className="mt-4 text-3xl md:text-4xl">Janaína Cunha</h2>
              <span className="gold-rule mt-6 w-24" aria-hidden="true" />
              <div className="mt-8 space-y-4 text-muted-foreground">
                <p>
                  [PLACEHOLDER] Há mais de 15 anos dedico meu trabalho a realçar a beleza de cada cliente
                  com técnica, escuta e delicadeza. Cada atendimento começa por entender a sua rotina, o
                  seu cabelo e o resultado que você deseja.
                </p>
                <p>
                  [PLACEHOLDER] No studio, valorizamos o tempo de quem chega: um ambiente tranquilo,
                  produtos de alta performance e um cuidado que continua depois que você sai daqui.
                </p>
              </div>
              <Button asChild className="mt-8 rounded-none uppercase tracking-[0.15em]">
                <Link to="/agendar">Agendar horário</Link>
              </Button>
            </div>
          </div>
        </Section>

        {/* ESPAÇO */}
        <section id="espaco" className="scroll-mt-24">
          <img
            src={espaco.url}
            alt="Letreiro dourado iluminado do Janaína Cunha Studio na parede de tijolos brancos"
            loading="lazy"
            className="h-[60vh] w-full object-cover"
          />
          <p className="bg-foreground px-5 py-6 text-center text-xs uppercase tracking-[0.3em] text-background">
            Nosso espaço — acolhedor, claro e feito para você respirar
          </p>
        </section>

        {/* DEPOIMENTOS */}
        <Section>
          <div className="text-center">
            <p className="eyebrow">Depoimentos</p>
            <h2 className="mt-4 text-3xl md:text-4xl">Quem passa por aqui</h2>
            <span className="gold-rule mx-auto mt-6 w-24" aria-hidden="true" />
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="border border-border bg-card p-8 text-center">
                <p className="font-serif text-xl leading-relaxed text-foreground">“{t.text}”</p>
                <footer className="mt-6 text-xs uppercase tracking-[0.2em] text-gold">{t.name}</footer>
              </blockquote>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <Section className="bg-foreground text-background">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl text-background md:text-4xl">Pronta para o seu momento?</h2>
            <p className="mt-6 text-sm leading-relaxed text-background/70">
              Escolha o serviço, o dia e o horário em menos de um minuto.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-none uppercase tracking-[0.15em]">
              <Link to="/agendar">Agendar horário</Link>
            </Button>
          </div>
        </Section>

        {/* CONTATO */}
        <Section id="contato" className="bg-cream">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="eyebrow">Contato</p>
              <h2 className="mt-4 text-3xl md:text-4xl">Venha nos visitar</h2>
              <span className="gold-rule mt-6 w-24" aria-hidden="true" />

              <ul className="mt-8 space-y-5 text-sm">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold" />
                  <span className="text-muted-foreground">{settings?.address || "[PLACEHOLDER] Endereço"}</span>
                </li>
                {whatsapp ? (
                  <li className="flex gap-3">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-gold" />
                    <a
                      href={whatsappLink(whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-gold"
                    >
                      WhatsApp {whatsapp}
                    </a>
                  </li>
                ) : null}
                {settings?.instagram ? (
                  <li className="flex gap-3">
                    <Instagram className="mt-0.5 size-4 shrink-0 text-gold" />
                    <a
                      href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-gold"
                    >
                      {settings.instagram}
                    </a>
                  </li>
                ) : null}
                <li className="flex gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-gold" />
                  <div className="space-y-1 text-muted-foreground">
                    {(hours ?? []).map((h) => (
                      <p key={h.id}>
                        <span className="inline-block w-32">{WEEKDAY_LABELS[h.weekday]}</span>
                        {h.is_closed ? "Fechado" : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`}
                      </p>
                    ))}
                  </div>
                </li>
              </ul>
            </div>

            <div className="min-h-64 border border-border bg-card">
              {settings?.map_embed_url ? (
                <iframe
                  title="Mapa do studio"
                  src={settings.map_embed_url}
                  loading="lazy"
                  className="h-full min-h-64 w-full"
                />
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  [PLACEHOLDER] Adicione o link do mapa nas configurações do painel para exibi-lo aqui.
                </div>
              )}
            </div>
          </div>
        </Section>
      </main>

      <Footer instagram={settings?.instagram} address={settings?.address} />
    </div>
  );
}
