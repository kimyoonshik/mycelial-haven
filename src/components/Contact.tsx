import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Instagram, Linkedin } from "lucide-react";

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    topic: "general",
    message: "",
  });
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API
    toast.success("Thank you — we'll reply within 3–5 business days.");
    setFormData({
      name: "",
      email: "",
      organization: "",
      topic: "general",
      message: "",
    });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Subscribed! You'll receive monthly mycelium insights.");
    setNewsletterEmail("");
  };

  return (
    <section id="contact" className="bg-warm-beige py-20 md:py-32">
      <div className="section-container">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-5xl text-ink-dark mb-4">
              Connect & Collaborate
            </h2>
            <p className="font-body text-lg text-ink-dark/70">
              Whether you're interested in swatches, wholesale, or collaboration—
              we'd love to hear from you.
            </p>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mb-16">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block font-ui text-sm text-ink-dark/80 mb-2">
                  Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white border-ink-dark/20 text-ink-dark focus:border-cognac focus:ring-cognac"
                />
              </div>

              <div>
                <label htmlFor="email" className="block font-ui text-sm text-ink-dark/80 mb-2">
                  Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white border-ink-dark/20 text-ink-dark focus:border-cognac focus:ring-cognac"
                />
              </div>
            </div>

            <div>
              <label htmlFor="organization" className="block font-ui text-sm text-ink-dark/80 mb-2">
                Organization / Role (optional)
              </label>
              <Input
                id="organization"
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="bg-white border-ink-dark/20 text-ink-dark focus:border-cognac focus:ring-cognac"
              />
            </div>

            <div>
              <label htmlFor="topic" className="block font-ui text-sm text-ink-dark/80 mb-2">
                Topic *
              </label>
              <select
                id="topic"
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-white border border-ink-dark/20 text-ink-dark font-body text-sm focus:border-cognac focus:ring-2 focus:ring-cognac focus:outline-none"
              >
                <option value="general">General Inquiry</option>
                <option value="swatch">Swatch Request</option>
                <option value="wholesale">Wholesale</option>
                <option value="collaboration">Collaboration</option>
                <option value="press">Press</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block font-ui text-sm text-ink-dark/80 mb-2">
                Message *
              </label>
              <Textarea
                id="message"
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="bg-white border-ink-dark/20 text-ink-dark focus:border-cognac focus:ring-cognac resize-none"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full"
            >
              Send Message
            </Button>
          </form>

          {/* Newsletter */}
          <div className="border-t border-ink-dark/20 pt-12">
            <div className="text-center mb-6">
              <h3 className="font-display text-2xl text-ink-dark mb-2">
                Stay Connected
              </h3>
              <p className="font-body text-sm text-ink-dark/70">
                Get monthly mycelium insights and project updates.
              </p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="flex gap-3 max-w-md mx-auto mb-8">
              <Input
                type="email"
                placeholder="Your email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-white border-ink-dark/20 text-ink-dark focus:border-cognac focus:ring-cognac"
              />
              <Button type="submit" variant="default">
                Subscribe
              </Button>
            </form>

            {/* Social Links */}
            <div className="flex justify-center gap-6">
              <a
                href="mailto:hello@mycerra.com"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-ink-dark/5 text-ink-dark hover:bg-cognac/10 hover:text-cognac transition-colors focus-ring"
                aria-label="Email MYCERRA"
              >
                <Mail className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-ink-dark/5 text-ink-dark hover:bg-cognac/10 hover:text-cognac transition-colors focus-ring"
                aria-label="Follow on Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-ink-dark/5 text-ink-dark hover:bg-cognac/10 hover:text-cognac transition-colors focus-ring"
                aria-label="Connect on LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
