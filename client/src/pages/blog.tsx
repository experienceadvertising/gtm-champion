import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { articles } from "@/data/articles";
import { Helmet } from "react-helmet";

export default function Blog() {
  const [, setLocation] = useLocation();

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "GTM Champion Blog",
    "description": "Expert insights on Go-To-Market strategy, B2B SaaS marketing, and growth tactics for modern companies.",
    "url": "https://gtmchampion.com/blog",
    "publisher": {
      "@type": "Organization",
      "name": "GTM Champion",
      "url": "https://gtmchampion.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://gtmchampion.com/favicon.svg"
      }
    },
    "blogPost": articles.map(article => ({
      "@type": "BlogPosting",
      "headline": article.title,
      "description": article.metaDescription,
      "url": `https://gtmchampion.com/blog/${article.slug}`,
      "datePublished": article.publishDate,
      "author": {
        "@type": "Organization",
        "name": article.author
      }
    }))
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://gtmchampion.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://gtmchampion.com/blog"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>GTM Champion Blog - B2B SaaS Marketing Insights</title>
        <meta name="description" content="Expert insights on Go-To-Market strategy, B2B SaaS marketing, and growth tactics. Learn from proven strategies across SEO, content, ABM, and more." />
        <link rel="canonical" href="https://gtmchampion.com/blog" />
        
        <meta property="og:title" content="GTM Champion Blog - B2B SaaS Marketing Insights" />
        <meta property="og:description" content="Expert insights on Go-To-Market strategy, B2B SaaS marketing, and growth tactics for modern companies." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gtmchampion.com/blog" />
        <meta property="og:image" content="https://gtmchampion.com/opengraph.jpg" />
        <meta property="og:image:alt" content="GTM Champion Blog - B2B SaaS Marketing Insights and Strategy Guides" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GTM Champion Blog - B2B SaaS Marketing Insights" />
        <meta name="twitter:description" content="Expert insights on Go-To-Market strategy, B2B SaaS marketing, and growth tactics." />
        <meta name="twitter:image" content="https://gtmchampion.com/opengraph.jpg" />
        <meta name="twitter:image:alt" content="GTM Champion Blog - B2B SaaS Marketing Insights and Strategy Guides" />
        
        <script type="application/ld+json">
          {JSON.stringify(blogJsonLd)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbJsonLd)}
        </script>
      </Helmet>
      
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <a href="/" className="flex items-center gap-2 font-display font-bold text-xl tracking-tight text-primary">
            <Zap className="h-6 w-6 fill-current" aria-hidden="true" />
            <span>GTM Champion</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="/" className="hover:text-primary transition-colors">Home</a>
            <a href="/blog" className="text-primary">Blog</a>
            <a href="/#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/auth")}>Log in</Button>
            <Button onClick={() => setLocation("/auth")}>Get Started</Button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="py-16 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 md:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              GTM Champion Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert insights on Go-To-Market strategy, B2B SaaS marketing, and growth tactics for modern companies.
            </p>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article, idx) => (
                <motion.article
                  key={article.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card 
                    className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
                    onClick={() => setLocation(`/blog/${article.slug}`)}
                    data-testid={`article-card-${article.slug}`}
                  >
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={article.image} 
                        alt={article.imageAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {article.readTime}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                        {article.title}
                      </h2>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.excerpt}
                      </p>
                      <div className="mt-4 flex items-center text-primary text-sm font-medium">
                        Read article <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary">
          <div className="container mx-auto px-4 md:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Get Your Personalized GTM Strategy
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
              Stop reading about strategy and start executing. GTM Champion analyzes your business and provides tailored recommendations.
            </p>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={() => setLocation("/auth")}
              data-testid="button-blog-cta"
            >
              Analyze My Website Free <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-white">
            <Zap className="h-5 w-5 fill-current" aria-hidden="true" />
            <span>GTM Champion</span>
          </div>
          <p className="text-sm text-slate-400">
            © 2025 GTM Champion. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}
