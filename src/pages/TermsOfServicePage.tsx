import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text-primary overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <Link to="/app" className="inline-flex items-center text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 flex items-center justify-center rounded-xl">
              <FileText className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          </div>
          <p className="text-text-secondary text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert prose-p:text-text-secondary prose-headings:text-text-primary max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Bergson, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Bergson is a local-first, digital brain and note-taking application. We provide a platform for organizing your thoughts, notes, and whiteboards directly on your device.
          </p>

          <h2>3. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the security of your data. Because Bergson is local-first, your data is stored on your device. We are not responsible for data loss resulting from clearing browser data, device failure, or other local issues. We recommend regularly backing up your data using the provided export tools or Google Drive Sync.
          </p>

          <h2>4. Google Drive Sync</h2>
          <p>
            If you use the Google Drive Sync feature, you agree to grant Bergson restricted access to your Google Drive for the sole purpose of creating and managing backups. You are responsible for managing your Google Drive storage and ensuring you have sufficient space for backups.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            The software, design, and source code of Bergson are the intellectual property of its developers. Your content (notes, whiteboards) remains entirely your own intellectual property.
          </p>

          <h2>6. Disclaimer of Warranty</h2>
          <p>
            Bergson is provided "as is", without warranty of any kind, express or implied. We do not warrant that the service will be uninterrupted, secure, or error-free.
          </p>

          <h2>7. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of any material changes by updating the date at the top of this page.
          </p>
        </div>
      </div>
    </div>
  );
};
