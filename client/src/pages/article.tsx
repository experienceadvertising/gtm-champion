import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, Clock, Calendar, User, Tag, ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getArticleBySlug, articles } from "@/data/articles";
import { Helmet } from "react-helmet";

export default function Article() {
  const [, params] = useRoute("/blog/:slug");
  const [, setLocation] = useLocation();
  
  const article = params?.slug ? getArticleBySlug(params.slug) : null;
  
  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Article not found</h1>
          <Button onClick={() => setLocation("/blog")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  const relatedArticles = articles
    .filter(a => a.slug !== article.slug && a.category === article.category)
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `https://gtmchampion.com/blog/${article.slug}`,
    "mainEntityOfPage": `https://gtmchampion.com/blog/${article.slug}`,
    "headline": article.title,
    "description": article.metaDescription,
    "image": `https://gtmchampion.com${article.image}`,
    "datePublished": article.publishDate,
    "dateModified": article.modifiedDate,
    "author": {
      "@type": "Organization",
      "name": article.author,
      "url": "https://gtmchampion.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "GTM Champion",
      "logo": {
        "@type": "ImageObject",
        "url": "https://gtmchampion.com/favicon.svg"
      }
    },
    "keywords": article.tags.join(", ")
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
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `https://gtmchampion.com/blog/${article.slug}`
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{article.metaTitle}</title>
        <meta name="description" content={article.metaDescription} />
        <meta name="keywords" content={article.tags.join(", ")} />
        <link rel="canonical" href={`https://gtmchampion.com/blog/${article.slug}`} />
        
        <meta property="og:title" content={article.metaTitle} />
        <meta property="og:description" content={article.metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://gtmchampion.com/blog/${article.slug}`} />
        <meta property="og:image" content={`https://gtmchampion.com${article.image}`} />
        <meta property="og:image:alt" content={article.imageAlt} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="article:published_time" content={article.publishDate} />
        <meta property="article:modified_time" content={article.modifiedDate} />
        <meta property="article:author" content={article.author} />
        <meta property="article:section" content={article.category} />
        {article.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.metaTitle} />
        <meta name="twitter:description" content={article.metaDescription} />
        <meta name="twitter:image" content={`https://gtmchampion.com${article.image}`} />
        <meta name="twitter:image:alt" content={article.imageAlt} />
        
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
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
          <article className="py-12">
            <div className="container mx-auto px-4 md:px-8">
              {/* Breadcrumb */}
              <nav className="mb-8 text-sm text-muted-foreground" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2">
                  <li><a href="/" className="hover:text-primary">Home</a></li>
                  <li>/</li>
                  <li><a href="/blog" className="hover:text-primary">Blog</a></li>
                  <li>/</li>
                  <li className="text-foreground truncate max-w-[200px]">{article.title}</li>
                </ol>
              </nav>

              <div className="max-w-4xl mx-auto">
                {/* Header */}
                <motion.header
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <Badge variant="secondary" className="mb-4">
                    {article.category}
                  </Badge>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 leading-tight">
                    {article.title}
                  </h1>
                  <p className="text-xl text-muted-foreground mb-6">
                    {article.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b pb-6">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" aria-hidden="true" />
                      <span>{article.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      <time dateTime={article.publishDate}>
                        {new Date(article.publishDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </time>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" aria-hidden="true" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                </motion.header>

                {/* Featured Image */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-10 rounded-xl overflow-hidden shadow-lg"
                >
                  <img 
                    src={article.image} 
                    alt={article.imageAlt}
                    className="w-full aspect-video object-cover"
                    loading="eager"
                  />
                </motion.div>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-slate-900 prose-pre:text-slate-50"
                  dangerouslySetInnerHTML={{ __html: formatContent(article.content) }}
                />

                {/* Tags */}
                <div className="mt-10 pt-6 border-t">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {article.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-10 p-8 bg-primary/5 rounded-xl border border-primary/10">
                  <h3 className="text-xl font-bold mb-2">Get Your Personalized GTM Strategy</h3>
                  <p className="text-muted-foreground mb-4">
                    GTM Champion analyzes your website and provides AI-powered recommendations across 13 marketing channels.
                  </p>
                  <Button onClick={() => setLocation("/auth")} data-testid="button-article-cta">
                    Analyze My Website Free <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </article>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="py-12 bg-slate-50 dark:bg-slate-900/50">
              <div className="container mx-auto px-4 md:px-8">
                <h2 className="text-2xl font-bold mb-8">Related Articles</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {relatedArticles.map(related => (
                    <a 
                      key={related.slug}
                      href={`/blog/${related.slug}`}
                      className="group"
                    >
                      <div className="aspect-video rounded-lg overflow-hidden mb-3">
                        <img 
                          src={related.image} 
                          alt={related.imageAlt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {related.title}
                      </h3>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 py-8">
          <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 font-display font-bold text-lg text-white">
              <Zap className="h-5 w-5 fill-current" aria-hidden="true" />
              <span>GTM Champion</span>
            </div>
            <p className="text-sm text-slate-400">
              © 2025–2026 GTM Champion. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

function formatContent(content: string): string {
  let html = content;
  
  // Process tables first (before other transformations)
  html = html.replace(/(\|[^\n]+\|\n)+/g, (tableMatch) => {
    const rows = tableMatch.trim().split('\n');
    let tableHtml = '<table class="w-full border-collapse my-6 text-sm">';
    
    rows.forEach((row, index) => {
      // Skip separator rows (|---|---|)
      if (/^\|[\s\-:]+\|$/.test(row.trim())) {
        return;
      }
      
      const cells = row.split('|').filter(cell => cell.trim() !== '');
      const isHeader = index === 0;
      const cellTag = isHeader ? 'th' : 'td';
      const cellClass = isHeader 
        ? 'border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-left' 
        : 'border border-slate-300 px-4 py-3';
      
      tableHtml += '<tr>';
      cells.forEach(cell => {
        tableHtml += `<${cellTag} class="${cellClass}">${cell.trim()}</${cellTag}>`;
      });
      tableHtml += '</tr>';
    });
    
    tableHtml += '</table>';
    return tableHtml;
  });
  
  // Headers
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Lists - handle consecutive list items
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  
  // Wrap consecutive li elements in ul
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul class="my-4 ml-6 list-disc space-y-2">${match}</ul>`);
  
  // Paragraphs - split by double newlines
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<table') || block.startsWith('<pre')) {
      return block;
    }
    return `<p>${block}</p>`;
  }).join('\n');
  
  // Clean up any remaining single newlines in paragraphs
  html = html.replace(/<p>([^<]*)<\/p>/g, (match, content) => {
    return `<p>${content.replace(/\n/g, ' ')}</p>`;
  });
  
  return html;
}
