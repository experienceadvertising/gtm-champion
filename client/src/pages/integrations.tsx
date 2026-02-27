import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  ArrowLeft,
  BarChart3,
  Users,
  FileSpreadsheet,
  FileText,
  Calendar,
  Mail,
  Check,
  Loader2,
  ExternalLink,
  Zap,
  Link2,
  Link2Off
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getSession, fetchUserIntegrations, updateIntegration, type UserIntegration } from "@/lib/api";

const AVAILABLE_INTEGRATIONS = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "See your traffic data and website performance alongside your GTM recommendations.",
    icon: BarChart3,
    category: "Analytics",
    color: "from-orange-500 to-yellow-500",
    features: ["Real-time traffic data", "Conversion tracking", "Audience insights"],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Connect your CRM to get personalized insights based on your customer data and pipeline.",
    icon: Users,
    category: "CRM",
    color: "from-orange-600 to-red-500",
    features: ["Contact sync", "Deal tracking", "Lead scoring"],
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Export your recommendations and track progress in spreadsheets.",
    icon: FileSpreadsheet,
    category: "Productivity",
    color: "from-green-500 to-emerald-500",
    features: ["Auto-export recommendations", "Progress tracking", "Custom reports"],
  },
  {
    id: "notion",
    name: "Notion",
    description: "Send your GTM strategies directly to Notion for team collaboration.",
    icon: FileText,
    category: "Productivity",
    color: "from-gray-700 to-gray-900",
    features: ["Strategy docs sync", "Team workspace", "Task management"],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Schedule your marketing activities and get reminders for key deadlines.",
    icon: Calendar,
    category: "Scheduling",
    color: "from-blue-500 to-cyan-500",
    features: ["Campaign scheduling", "Deadline reminders", "Team calendars"],
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Integrate with Microsoft Outlook for email and calendar syncing.",
    icon: Mail,
    category: "Productivity",
    color: "from-blue-600 to-indigo-600",
    features: ["Calendar sync", "Email integration", "Task reminders"],
  },
];

export default function Integrations() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const session = getSession();
  const userId = session?.userId;

  useEffect(() => {
    if (!userId) {
      setLocation("/auth");
    }
  }, [userId, setLocation]);

  const { data: userIntegrations = [], isLoading } = useQuery({
    queryKey: ["integrations", userId],
    queryFn: () => fetchUserIntegrations(userId!),
    enabled: !!userId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ integrationId, integrationName, isConnected }: { 
      integrationId: string; 
      integrationName: string; 
      isConnected: boolean 
    }) => {
      await updateIntegration(userId!, integrationId, integrationName, isConnected);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["integrations", userId] });
      toast({
        title: variables.isConnected ? "Integration Connected!" : "Integration Disconnected",
        description: variables.isConnected 
          ? `${variables.integrationName} has been connected to your account.`
          : `${variables.integrationName} has been disconnected.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isConnected = (integrationId: string) => {
    return userIntegrations.some(ui => ui.integrationId === integrationId && ui.isConnected);
  };

  const getConnectionDate = (integrationId: string) => {
    const integration = userIntegrations.find(ui => ui.integrationId === integrationId);
    if (integration?.connectedAt) {
      return new Date(integration.connectedAt).toLocaleDateString();
    }
    return null;
  };

  const handleToggle = (integration: typeof AVAILABLE_INTEGRATIONS[0]) => {
    const currentlyConnected = isConnected(integration.id);
    toggleMutation.mutate({
      integrationId: integration.id,
      integrationName: integration.name,
      isConnected: !currentlyConnected,
    });
  };

  const connectedCount = userIntegrations.filter(ui => ui.isConnected).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} data-testid="button-back">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold">Integrations</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold font-display">Connect Your Tools</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Supercharge your GTM strategy by connecting the tools you already use. 
              Get personalized insights based on your real data.
            </p>
            {connectedCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                <Check className="mr-1 h-3 w-3" /> {connectedCount} integration{connectedCount > 1 ? 's' : ''} connected
              </Badge>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AVAILABLE_INTEGRATIONS.map((integration, index) => {
                const connected = isConnected(integration.id);
                const connectionDate = getConnectionDate(integration.id);
                const Icon = integration.icon;
                
                return (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className={`h-full transition-all duration-300 hover:shadow-lg ${
                        connected ? 'ring-2 ring-primary/50 bg-primary/5' : ''
                      }`}
                      data-testid={`card-integration-${integration.id}`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-white shadow-lg`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          {connected && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <Check className="mr-1 h-3 w-3" /> Connected
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="mt-4">{integration.name}</CardTitle>
                        <Badge variant="outline" className="w-fit">{integration.category}</Badge>
                        <CardDescription className="mt-2">
                          {integration.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          {integration.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                              {feature}
                            </div>
                          ))}
                        </div>
                        
                        {connectionDate && (
                          <p className="text-xs text-muted-foreground">
                            Connected since {connectionDate}
                          </p>
                        )}

                        <Button
                          className="w-full"
                          variant={connected ? "outline" : "default"}
                          onClick={() => handleToggle(integration)}
                          disabled={toggleMutation.isPending}
                          data-testid={`button-toggle-${integration.id}`}
                        >
                          {toggleMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : connected ? (
                            <Link2Off className="mr-2 h-4 w-4" />
                          ) : (
                            <Link2 className="mr-2 h-4 w-4" />
                          )}
                          {connected ? "Disconnect" : "Connect"}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="text-center pt-8 border-t">
            <p className="text-muted-foreground text-sm">
              Need a different integration?{" "}
              <a href="mailto:support@gtmchampion.com" className="text-primary hover:underline">
                Let us know
              </a>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
