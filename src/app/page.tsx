'use client';

import { useState, useEffect } from 'react';
import { APIKeys } from '@/types';
import APIKeyManager from '@/components/APIKeyManager';
import MotivationalSongWorkflow from '@/components/MotivationalSongWorkflow';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui';

export default function Home() {
  const [validatedKeys, setValidatedKeys] = useState<APIKeys | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeysValidated = (keys: APIKeys) => {
    setValidatedKeys(keys);
    console.log('Keys validated successfully!', { 
      hasOpenAI: !!keys.openaiKey, 
      hasElevenLabs: !!keys.elevenlabsKey 
    });
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="text-center mb-12 lg:mb-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 lg:mb-6">
            Create Your Perfect
            <span className="text-primary block sm:inline sm:ml-3">
              Motivational Song
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
            Transform your favorite music into personalized motivational content using 
            AI-powered speech generation and professional audio processing.
          </p>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                <span className="text-2xl" role="img" aria-label="AI brain">🧠</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">AI-Powered</h3>
              <p className="text-sm text-muted-foreground text-center">
                Advanced AI generates personalized motivational content
              </p>
            </div>
            
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-3">
                <span className="text-2xl" role="img" aria-label="High quality">🎯</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">High Quality</h3>
              <p className="text-sm text-muted-foreground text-center">
                Professional audio processing with seamless integration
              </p>
            </div>
            
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-3">
                <span className="text-2xl" role="img" aria-label="Secure">🔒</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">Secure</h3>
              <p className="text-sm text-muted-foreground text-center">
                Your API keys stay local, no data stored on servers
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mb-12 lg:mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Powerful Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to create personalized motivational content with professional quality
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* AI Content Generation */}
          <Card className="h-full">
            <CardHeader padding="md">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl" role="img" aria-label="AI brain">🧠</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                AI Content Generation
              </h3>
            </CardHeader>
            <CardContent padding="md">
              <p className="text-muted-foreground mb-4">
                Advanced AI creates personalized motivational speeches tailored to your goals, personality, and preferences.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Personalized content based on your input
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Multiple motivational styles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Context-aware messaging
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Voice Synthesis */}
          <Card className="h-full">
            <CardHeader padding="md">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl" role="img" aria-label="Microphone">🎤</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Professional Voice Synthesis
              </h3>
            </CardHeader>
            <CardContent padding="md">
              <p className="text-muted-foreground mb-4">
                High-quality text-to-speech powered by ElevenLabs with natural-sounding voices and emotional expression.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Multiple speaker personalities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Natural emotional expression
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Studio-quality audio output
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Music Integration */}
          <Card className="h-full">
            <CardHeader padding="md">
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl" role="img" aria-label="Music">🎵</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                YouTube Music Integration
              </h3>
            </CardHeader>
            <CardContent padding="md">
              <p className="text-muted-foreground mb-4">
                Seamlessly integrate your favorite YouTube tracks as background music for your motivational content.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Direct YouTube URL support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Automatic audio processing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Perfect audio mixing
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="h-full">
            <CardHeader padding="md">
              <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl" role="img" aria-label="Security">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Privacy & Security
              </h3>
            </CardHeader>
            <CardContent padding="md">
              <p className="text-muted-foreground mb-4">
                Your data stays secure with local API key storage and no server-side data persistence.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Local API key storage
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  No data stored on servers
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  GDPR compliant processing
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Easy to Use */}
          <Card className="h-full">
            <CardHeader padding="md">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl" role="img" aria-label="Easy">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Simple & Fast
              </h3>
            </CardHeader>
            <CardContent padding="md">
              <p className="text-muted-foreground mb-4">
                Intuitive interface that gets you from idea to finished motivational song in minutes.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  One-click generation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Real-time progress tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Instant download ready
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Customization */}
          <Card className="h-full">
            <CardHeader padding="md">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl" role="img" aria-label="Customize">🎨</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Full Customization
              </h3>
            </CardHeader>
            <CardContent padding="md">
              <p className="text-muted-foreground mb-4">
                Tailor every aspect of your motivational content to match your personal style and goals.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Personal information integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Custom motivational themes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  Flexible content length
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Content */}
      <div className="space-y-8 lg:space-y-12">
        {/* API Key Management Section */}
        <section>
          <APIKeyManager onKeysValidated={handleKeysValidated} />
        </section>

        {/* Main Workflow */}
        {mounted && validatedKeys && (
          <section>
            <MotivationalSongWorkflow apiKeys={validatedKeys} />
          </section>
        )}

        {/* Next Steps Section */}
        <section>
          <Card variant="elevated" className="border-info/20 bg-info/5">
            <CardHeader padding="md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
                  <span className="text-info text-xl" role="img" aria-label="Rocket">🚀</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-info mb-1">
                    Ready to Get Started?
                  </h2>
                  <p className="text-info/80 text-sm">
                    Here&apos;s what you can do once your API keys are configured
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent padding="md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground mb-3">Create Your Song</h3>
                  <div className="space-y-3">
                    {[
                      { icon: '👤', text: 'Input your personal information and preferences' },
                      { icon: '🎯', text: 'Select a motivational speaker style' },
                      { icon: '🎵', text: 'Choose a YouTube song for background music' },
                    ].map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm" role="img" aria-hidden="true">{step.icon}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground mb-3">AI Processing</h3>
                  <div className="space-y-3">
                    {[
                      { icon: '🧠', text: 'Generate AI-powered motivational speech' },
                      { icon: '🎤', text: 'Convert text to high-quality voice audio' },
                      { icon: '🎶', text: 'Create your personalized motivational song' },
                    ].map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm" role="img" aria-hidden="true">{step.icon}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works">
          <Card>
            <CardHeader padding="md">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                How It Works
              </h2>
              <p className="text-muted-foreground">
                Our AI-powered process creates personalized motivational content in just a few steps
              </p>
            </CardHeader>
            <CardContent padding="md">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {[
                  {
                    step: '1',
                    title: 'Setup',
                    description: 'Configure your OpenAI and ElevenLabs API keys securely',
                    icon: '⚙️'
                  },
                  {
                    step: '2',
                    title: 'Personalize',
                    description: 'Enter your details and choose your motivational speaker',
                    icon: '✏️'
                  },
                  {
                    step: '3',
                    title: 'Generate',
                    description: 'AI creates personalized content and converts it to speech',
                    icon: '🤖'
                  },
                  {
                    step: '4',
                    title: 'Enjoy',
                    description: 'Download your custom motivational song and get inspired',
                    icon: '🎉'
                  }
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl" role="img" aria-hidden="true">{item.icon}</span>
                    </div>
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Support Section */}
        <section id="support">
          <Card>
            <CardHeader padding="md">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Need Help?
              </h2>
              <p className="text-muted-foreground">
                Get support and learn more about using the AI Motivation Song Generator
              </p>
            </CardHeader>
            <CardContent padding="md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Getting Started */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label="Getting started">🚀</span>
                    Getting Started
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">API Keys Required</h4>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll need OpenAI and ElevenLabs API keys to use this service. 
                        Both are stored locally in your browser for security.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">YouTube Integration</h4>
                      <p className="text-sm text-muted-foreground">
                        Simply paste any YouTube URL to use as background music. 
                        The system will handle audio extraction and processing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FAQ */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <span className="text-xl" role="img" aria-label="FAQ">❓</span>
                    Frequently Asked Questions
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">Is my data secure?</h4>
                      <p className="text-sm text-muted-foreground">
                        Yes! All API keys are stored locally in your browser. 
                        No personal data is sent to our servers.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">What audio formats are supported?</h4>
                      <p className="text-sm text-muted-foreground">
                        The final output is provided as high-quality MP3 files 
                        ready for download and sharing.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="font-medium text-foreground mb-1">How long does generation take?</h4>
                      <p className="text-sm text-muted-foreground">
                        Typically 30-60 seconds depending on content length 
                        and current API response times.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Still Need Help?
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    This is an open-source project. Feel free to contribute or report issues.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span className="text-lg" role="img" aria-label="GitHub">📚</span>
                      Documentation & Source Code Available
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <span className="text-lg" role="img" aria-label="Community">👥</span>
                      Community Driven Development
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
