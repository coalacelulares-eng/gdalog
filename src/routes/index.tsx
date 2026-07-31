import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Rocket, 
  Code2, 
  Zap, 
  ShieldCheck, 
  Layers, 
  ArrowRight, 
  Github, 
  CheckCircle2 
} from "lucide-react";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <Sparkles className="h-4 w-4" />
            </div>
            <span>Lovable App</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#tech" className="hover:text-foreground transition-colors">Tecnologias</a>
            <a href="#about" className="hover:text-foreground transition-colors">Sobre</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="gap-2">
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
            <Button size="sm" className="gap-2">
              Começar Agora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 border-b border-border/40 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
          <Badge variant="secondary" className="mb-6 px-4 py-1 text-sm font-medium rounded-full gap-2 inline-flex">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Construído com TanStack Start & React 19
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Crie aplicações web incríveis na velocidade da luz
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Sua aplicação está pronta para decolar. Este projeto foi gerado automaticamente e otimizado para alta performance e excelente experiência de desenvolvimento.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 h-12 shadow-lg">
              <Rocket className="h-5 w-5" />
              Explorar Projeto
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-8 h-12">
              <Code2 className="h-5 w-5" />
              Ver Documentação
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Tudo o que você precisa</h2>
            <p className="text-muted-foreground">
              Uma stack moderna e robusta para escalar seu produto sem complicações.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Zap className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Alta Performance</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Renderização otimizada no lado do servidor (SSR) com TanStack Start e compilação ultrarrápida via Vite.
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Tipagem Rigorosa</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Totalmente integrado com TypeScript, garantindo segurança de tipos de ponta a ponta e rotas fortemente tipadas.
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Design Moderno</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Componentes acessíveis inspirados no shadcn/ui e estilizados com Tailwind CSS v4.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tech Stack List */}
      <section id="tech" className="py-20 border-t border-border/40">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Stack Tecnológica</h2>
            <p className="text-muted-foreground">As melhores ferramentas do ecossistema React atual.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "TanStack Start & Router",
              "React 19 & ReactDOM",
              "Tailwind CSS v4",
              "Radix UI Primitives",
              "TanStack Query",
              "TypeScript & Vite",
            ].map((tech, index) => (
              <div key={index} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span className="font-medium">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 py-8 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Lovable App. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
