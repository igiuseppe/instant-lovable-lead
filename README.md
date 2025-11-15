# AI Voice Lead Qualification MVP

An AI-native CRM platform that demonstrates instant lead qualification using AI voice agents.

## Overview

This MVP showcases how AI voice technology can transform inbound lead qualification:
- **Instant Response**: AI voice agent automatically calls new leads
- **Intelligent Qualification**: Follows structured criteria to assess lead quality
- **Real-time Updates**: CRM dashboard updates live during calls
- **Actionable Insights**: Generates call summaries, insights, and next actions

## Features

### 🎯 Lead Trigger
Simulate inbound leads from your website with a simple form.

### 🤖 AI Voice Agent
Automated qualification calls that:
- Ask discovery questions
- Handle objections
- Evaluate fit based on criteria
- Attempt to book meetings

### 📊 Real-time CRM Dashboard
- Live status updates
- Qualification scores
- Lead pipeline overview
- Instant notifications

### 📈 Post-Call Intelligence
- Call summaries
- Key insights extraction
- Objection tracking
- Recommended next actions

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase)
- **AI**: Lovable AI Gateway (Google Gemini)
- **Real-time**: Supabase Realtime

## Getting Started

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/c383c17d-6008-4b1c-afc9-8723f90c8c66) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
