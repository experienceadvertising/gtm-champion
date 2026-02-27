import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Linkedin, 
  Mail, 
  FileText, 
  ArrowLeft, 
  Loader2, 
  Copy, 
  Check,
  Sparkles,
  Crown,
  Lock
} from "lucide-react";
import { 
  getSession, 
  fetchDashboard,
  generateLinkedInPosts, 
  generateEmailCampaign, 
  generateBlogArticle,
  type LinkedInPost,
  type GeneratedEmail,
  type GeneratedArticle
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ContentTools() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  
  const urlParams = new URLSearchParams(searchString);
  const urlUserId = urlParams.get("userId");
  const session = getSession();
  const userId = urlUserId || session?.userId;

  const [activeTab, setActiveTab] = useState("linkedin");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // LinkedIn state
  const [linkedinTopic, setLinkedinTopic] = useState("");
  const [linkedinTone, setLinkedinTone] = useState<'thought-leader' | 'educational' | 'storytelling' | 'promotional'>('thought-leader');
  const [linkedinRole, setLinkedinRole] = useState("Founder & CEO");
  const [linkedinPosts, setLinkedinPosts] = useState<LinkedInPost[]>([]);
  const [linkedinLoading, setLinkedinLoading] = useState(false);

  // Email state
  const [emailCampaignType, setEmailCampaignType] = useState<'welcome' | 'nurture' | 'promotional' | 're-engagement'>('welcome');
  const [emailCount, setEmailCount] = useState(3);
  const [emailGoal, setEmailGoal] = useState("");
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);

  // Blog state
  const [blogTopic, setBlogTopic] = useState("");
  const [blogKeyword, setBlogKeyword] = useState("");
  const [blogType, setBlogType] = useState<'how-to' | 'listicle' | 'thought-leadership' | 'case-study'>('how-to');
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [blogLoading, setBlogLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLocation("/auth");
    }
  }, [userId, setLocation]);

  const { data: dashboardData, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => fetchDashboard(userId!),
    enabled: !!userId,
    retry: false,
  });

  const isPremium = dashboardData?.user?.isPremium;

  // Handle authentication/authorization errors
  useEffect(() => {
    if (isError && error) {
      const errorMsg = (error as Error).message || '';
      if (errorMsg.includes('401') || errorMsg.includes('not found')) {
        setLocation("/auth");
      }
    }
  }, [isError, error, setLocation]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const handleGenerateLinkedin = async () => {
    if (!userId || !linkedinTopic) return;
    setLinkedinLoading(true);
    try {
      const result = await generateLinkedInPosts(userId, {
        topic: linkedinTopic,
        tone: linkedinTone,
        authorRole: linkedinRole
      });
      setLinkedinPosts(result.posts || []);
      toast({ title: "LinkedIn posts generated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLinkedinLoading(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!userId || !emailGoal) return;
    setEmailLoading(true);
    try {
      const result = await generateEmailCampaign(userId, {
        campaignType: emailCampaignType,
        emailCount,
        goal: emailGoal
      });
      setEmails(result.emails || []);
      toast({ title: "Email campaign generated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGenerateBlog = async () => {
    if (!userId || !blogTopic || !blogKeyword) return;
    setBlogLoading(true);
    try {
      const result = await generateBlogArticle(userId, {
        topic: blogTopic,
        targetKeyword: blogKeyword,
        articleType: blogType
      });
      setArticle(result.article || null);
      toast({ title: "Blog article generated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setBlogLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-6">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6">
              Content Tools are available exclusively for Pro subscribers. 
              Upgrade to generate LinkedIn posts, email campaigns, and blog articles.
            </p>
            <div className="space-y-3">
              <Button onClick={() => setLocation(`/upgrade?userId=${userId}`)} className="w-full">
                <Crown className="mr-2 h-4 w-4" /> Upgrade to Pro
              </Button>
              <Button variant="outline" onClick={() => setLocation(`/dashboard?userId=${userId}`)} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/dashboard?userId=${userId}`}>
              <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </div>
          <Badge variant="secondary" className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-200">
            <Crown className="mr-1 h-3 w-3" /> Pro Feature
          </Badge>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold text-sm">AI Content Generator</span>
          </div>
          <h1 className="text-3xl font-bold font-display mb-2">Content Tools</h1>
          <p className="text-muted-foreground">
            Generate marketing content tailored to your company with AI
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="linkedin" className="gap-2" data-testid="tab-linkedin">
              <Linkedin className="h-4 w-4" /> LinkedIn
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2" data-testid="tab-email">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="blog" className="gap-2" data-testid="tab-blog">
              <FileText className="h-4 w-4" /> Blog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="linkedin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Linkedin className="h-5 w-5 text-[#0077B5]" />
                  LinkedIn Post Generator
                </CardTitle>
                <CardDescription>
                  Generate thought leadership posts for founders and team members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-topic">Topic or Theme</Label>
                    <Input
                      id="linkedin-topic"
                      placeholder="e.g., Why we rebuilt our onboarding flow"
                      value={linkedinTopic}
                      onChange={(e) => setLinkedinTopic(e.target.value)}
                      data-testid="input-linkedin-topic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin-role">Author Role</Label>
                    <Input
                      id="linkedin-role"
                      placeholder="e.g., Founder & CEO"
                      value={linkedinRole}
                      onChange={(e) => setLinkedinRole(e.target.value)}
                      data-testid="input-linkedin-role"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={linkedinTone} onValueChange={(v: any) => setLinkedinTone(v)}>
                    <SelectTrigger data-testid="select-linkedin-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thought-leader">Thought Leader</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGenerateLinkedin} 
                  disabled={linkedinLoading || !linkedinTopic}
                  className="w-full"
                  data-testid="button-generate-linkedin"
                >
                  {linkedinLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate 3 Posts</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {linkedinPosts.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Generated Posts</h3>
                {linkedinPosts.map((post, idx) => (
                  <Card key={idx} className="relative">
                    <CardContent className="pt-6">
                      <div className="absolute top-4 right-4">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(post.content, `linkedin-${idx}`)}
                          data-testid={`button-copy-linkedin-${idx}`}
                        >
                          {copiedId === `linkedin-${idx}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Badge className="mb-3">Post {idx + 1}</Badge>
                      <p className="text-sm font-medium text-primary mb-2">{post.hook}</p>
                      <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 mb-4">
                        {post.content}
                      </pre>
                      <p className="text-xs text-muted-foreground italic">CTA: {post.cta}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Email Campaign Writer
                </CardTitle>
                <CardDescription>
                  Generate complete email sequences for any campaign type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Campaign Type</Label>
                    <Select value={emailCampaignType} onValueChange={(v: any) => setEmailCampaignType(v)}>
                      <SelectTrigger data-testid="select-email-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="welcome">Welcome / Onboarding</SelectItem>
                        <SelectItem value="nurture">Lead Nurture</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="re-engagement">Re-engagement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Number of Emails</Label>
                    <Select value={String(emailCount)} onValueChange={(v) => setEmailCount(Number(v))}>
                      <SelectTrigger data-testid="select-email-count">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 emails</SelectItem>
                        <SelectItem value="5">5 emails</SelectItem>
                        <SelectItem value="7">7 emails</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-goal">Campaign Goal</Label>
                  <Textarea
                    id="email-goal"
                    placeholder="e.g., Onboard new users and get them to complete their first project within 7 days"
                    value={emailGoal}
                    onChange={(e) => setEmailGoal(e.target.value)}
                    data-testid="input-email-goal"
                  />
                </div>
                <Button 
                  onClick={handleGenerateEmail} 
                  disabled={emailLoading || !emailGoal}
                  className="w-full"
                  data-testid="button-generate-email"
                >
                  {emailLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Campaign</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {emails.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Generated Email Campaign</h3>
                {emails.map((email, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge>{email.sendTiming}</Badge>
                          <span className="font-semibold">Email {idx + 1}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`, `email-${idx}`)}
                          data-testid={`button-copy-email-${idx}`}
                        >
                          {copiedId === `email-${idx}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Subject Line</p>
                          <p className="font-medium">{email.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Preview Text</p>
                          <p className="text-sm text-slate-600">{email.preheader}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Email Body</p>
                          <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 bg-slate-50 p-4 rounded-lg">
                            {email.body}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="blog" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Blog Article Writer
                </CardTitle>
                <CardDescription>
                  Generate SEO-optimized blog posts for content marketing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="blog-topic">Article Topic</Label>
                    <Input
                      id="blog-topic"
                      placeholder="e.g., How to improve customer retention in SaaS"
                      value={blogTopic}
                      onChange={(e) => setBlogTopic(e.target.value)}
                      data-testid="input-blog-topic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blog-keyword">Target Keyword</Label>
                    <Input
                      id="blog-keyword"
                      placeholder="e.g., SaaS customer retention"
                      value={blogKeyword}
                      onChange={(e) => setBlogKeyword(e.target.value)}
                      data-testid="input-blog-keyword"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Article Type</Label>
                  <Select value={blogType} onValueChange={(v: any) => setBlogType(v)}>
                    <SelectTrigger data-testid="select-blog-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="how-to">How-To Guide</SelectItem>
                      <SelectItem value="listicle">Listicle (Top 10, etc.)</SelectItem>
                      <SelectItem value="thought-leadership">Thought Leadership</SelectItem>
                      <SelectItem value="case-study">Case Study</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGenerateBlog} 
                  disabled={blogLoading || !blogTopic || !blogKeyword}
                  className="w-full"
                  data-testid="button-generate-blog"
                >
                  {blogLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating (may take 30+ seconds)...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Article</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {article && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="secondary">{article.wordCount} words</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(article.fullContent, 'blog')}
                      data-testid="button-copy-blog"
                    >
                      {copiedId === 'blog' ? (
                        <><Check className="mr-2 h-4 w-4 text-green-500" /> Copied</>
                      ) : (
                        <><Copy className="mr-2 h-4 w-4" /> Copy Article</>
                      )}
                    </Button>
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2">{article.title}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{article.metaDescription}</p>
                  
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Outline</p>
                    <div className="flex flex-wrap gap-2">
                      {article.outline.map((section, idx) => (
                        <Badge key={idx} variant="outline">{section}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <ScrollArea className="h-[500px]">
                    <article className="prose prose-slate max-w-none">
                      <pre className="whitespace-pre-wrap text-sm font-sans">
                        {article.fullContent}
                      </pre>
                    </article>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
