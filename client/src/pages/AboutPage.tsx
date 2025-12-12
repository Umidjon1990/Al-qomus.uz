import { Layout } from "@/components/Layout";
import { BookOpen, Users, Globe, MessageSquare, Search, ArrowRight, Database, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function AboutPage() {
  const { data: stats } = useQuery({
    queryKey: ["dictionary-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dictionary/stats");
      if (!res.ok) throw new Error("Stats fetch failed");
      return res.json();
    },
  });

  return (
    <Layout>
      <div className="min-h-screen">
        <section className="bg-gradient-to-br from-primary/5 via-secondary/5 to-background py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Star className="h-4 w-4" />
                O'zbekistondagi eng katta arab tili onlayn lug'ati
              </div>
              
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                QOMUS<span className="text-secondary">.UZ</span> Loyihasi Haqida
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                Professional Arabcha-O'zbekcha onlayn lug'at platformasi. 
                Bu loyiha O'zbekistondagi arab tili online lug'atshunosligidagi eng katta va eng to'liq manba hisoblanadi.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <Card className="text-center border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardContent className="pt-6">
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                    {stats?.total?.toLocaleString() || "108,000+"}
                  </div>
                  <p className="text-sm text-muted-foreground">Jami so'zlar</p>
                </CardContent>
              </Card>
              
              <Card className="text-center border-secondary/20 bg-gradient-to-br from-secondary/5 to-background">
                <CardContent className="pt-6">
                  <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">3</div>
                  <p className="text-sm text-muted-foreground">Lug'atlar soni</p>
                </CardContent>
              </Card>
              
              <Card className="text-center border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-background">
                <CardContent className="pt-6">
                  <div className="text-4xl md:text-5xl font-bold text-emerald-600 mb-2">29,682</div>
                  <p className="text-sm text-muted-foreground">Ghoniy lug'ati</p>
                </CardContent>
              </Card>
              
              <Card className="text-center border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
                <CardContent className="pt-6">
                  <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-2">100%</div>
                  <p className="text-sm text-muted-foreground">Bepul foydalanish</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-serif text-3xl font-bold text-center mb-12">Loyiha haqida</h2>
              
              <div className="prose prose-lg max-w-none text-muted-foreground">
                <Card className="mb-8">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <Database className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Eng katta arab tili lug'ati</h3>
                        <p className="text-muted-foreground">
                          QOMUS.UZ — bu O'zbekistondagi arab tili onlayn lug'atshunosligidagi eng katta loyiha. 
                          Platformada <strong className="text-foreground">108,000 dan ortiq so'z va iboralar</strong> jamlangan bo'lib, 
                          ular 3 ta asosiy lug'atdan olingan: <strong className="text-foreground">Ghoniy (الغني)</strong> — 29,682 ta so'z harakat bilan, 
                          <strong className="text-foreground">Muasir</strong> — 32,292 ta so'z va <strong className="text-foreground">Roid</strong> — 46,931 ta so'z.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-8">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-secondary/10 p-3 rounded-lg">
                        <BookOpen className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Ghoniy lug'ati (الغني)</h3>
                        <p className="text-muted-foreground">
                          Ghoniy lug'ati — bu loyihamizning asosiy lug'ati. U arab tilidagi so'zlarni 
                          <strong className="text-foreground"> to'liq harakat (tashkil) bilan</strong> taqdim etadi. 
                          Bu o'quvchilarga so'zlarni to'g'ri talaffuz qilishda yordam beradi. 
                          Lug'atda har bir so'zning ma'nosi, grammatik tahlili va kontekstdagi ishlatilishi keltirilgan.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mb-8">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-emerald-500/10 p-3 rounded-lg">
                        <Users className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Loyiha asoschisi</h3>
                        <p className="text-muted-foreground">
                          Bu loyiha <strong className="text-foreground">Umidjon Abdurayimov</strong> tomonidan asos solingan. 
                          Loyihaning maqsadi — arab tilini o'rganayotgan o'zbek yoshlariga sifatli va bepul 
                          lug'at xizmatini taqdim etish. 
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-serif text-3xl font-bold text-center mb-12">Qanday foydalanish mumkin?</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">Veb-sayt orqali</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="bg-primary/10 text-primary text-sm font-medium px-2 py-0.5 rounded">1</span>
                        <span>Qidiruv maydoniga arab yoki o'zbek so'zini kiriting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-primary/10 text-primary text-sm font-medium px-2 py-0.5 rounded">2</span>
                        <span>Lug'atni tanlang (Ghoniy, Muasir yoki Roid)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-primary/10 text-primary text-sm font-medium px-2 py-0.5 rounded">3</span>
                        <span>Natijalarni ko'ring va kerakli ma'lumotni oling</span>
                      </li>
                    </ol>
                    <Link href="/">
                      <Button className="w-full mt-4" variant="outline">
                        <Search className="h-4 w-4 mr-2" />
                        Lug'atga o'tish
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-blue-500/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">Telegram bot orqali</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-3 text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-500/10 text-blue-600 text-sm font-medium px-2 py-0.5 rounded">1</span>
                        <span>Telegram'da @qomusuzbot ni toping</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-500/10 text-blue-600 text-sm font-medium px-2 py-0.5 rounded">2</span>
                        <span>/start buyrug'ini yuboring</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-500/10 text-blue-600 text-sm font-medium px-2 py-0.5 rounded">3</span>
                        <span>Izlayotgan so'zingizni yozing va natijani oling</span>
                      </li>
                    </ol>
                    <a href="https://t.me/qomusuzbot" target="_blank" rel="noopener noreferrer">
                      <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Telegram botga o'tish
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-br from-primary/5 via-secondary/5 to-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Savollaringiz bormi?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Agar sizda loyiha bo'yicha savollar yoki takliflar bo'lsa, 
              Telegram bot orqali biz bilan bog'lanishingiz mumkin.
            </p>
            <a href="https://t.me/qomusuzbot" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                <MessageSquare className="h-5 w-5 mr-2" />
                Bog'lanish
              </Button>
            </a>
          </div>
        </section>
      </div>
    </Layout>
  );
}
