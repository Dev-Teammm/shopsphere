"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback, SubmitFeedbackRequest } from "@/lib/feedbackService";

interface GiveFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  defaultEmail?: string;
}

export function GiveFeedbackDialog({
  open,
  onOpenChange,
  defaultName = "",
  defaultEmail = "",
}: GiveFeedbackDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const resetForm = () => {
    setName(defaultName);
    setEmail(defaultEmail);
    setContent("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedContent = content.trim();
    if (!trimmedName) {
      toast.error(t("feedback.nameRequired"));
      return;
    }
    if (!trimmedEmail) {
      toast.error(t("feedback.emailRequired"));
      return;
    }
    if (!trimmedContent) {
      toast.error(t("feedback.feedbackRequired"));
      return;
    }
    try {
      setSending(true);
      const request: SubmitFeedbackRequest = {
        username: trimmedName,
        email: trimmedEmail,
        content: trimmedContent,
      };
      await submitFeedback(request);
      toast.success(t("feedback.success"));
      handleClose(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(e.message || t("feedback.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("feedback.title")}
          </DialogTitle>
          <DialogDescription>{t("feedback.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feedback-name">{t("feedback.nameLabel")}</Label>
            <Input
              id="feedback-name"
              placeholder={t("feedback.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="feedback-email">{t("feedback.emailLabel")}</Label>
            <Input
              id="feedback-email"
              type="email"
              placeholder={t("feedback.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="feedback-content">
              {t("feedback.contentLabel")}
            </Label>
            <Textarea
              id="feedback-content"
              placeholder={t("feedback.contentPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="mt-1 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              {t("feedback.close")}
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("feedback.sending")}
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("feedback.send")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
