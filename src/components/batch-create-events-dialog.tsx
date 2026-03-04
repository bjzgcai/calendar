"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

type ParsedBatchEvent = {
  title: string;
  content: string | null;
  date: string;
  location: string | null;
  organizer: string | null;
  eventType: string | null;
  tags: string;
  link: string | null;
  imageUrl: string | null;
};

function isValidExactDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() + 1 === month &&
    utcDate.getUTCDate() === day
  );
}

interface BatchCreateEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BatchCreateEventsDialog({ open, onOpenChange, onSuccess }: BatchCreateEventsDialogProps) {
  const [textValue, setTextValue] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [parsedEvents, setParsedEvents] = useState<ParsedBatchEvent[]>([]);

  const canParse = useMemo(() => {
    return !uploading && !parsing && (textValue.trim().length > 0 || imageUrls.length > 0);
  }, [uploading, parsing, textValue, imageUrls.length]);

  const canConfirm = parsedEvents.length > 0 && !creating;
  const sortedParsedEventEntries = useMemo(() => {
    return parsedEvents
      .map((event, originalIndex) => ({
        event,
        originalIndex,
        timestamp: Date.parse(event.date),
      }))
      .sort((a, b) => {
        const aValid = Number.isFinite(a.timestamp);
        const bValid = Number.isFinite(b.timestamp);
        if (aValid && bValid) return a.timestamp - b.timestamp;
        if (aValid) return -1;
        if (bValid) return 1;
        return a.originalIndex - b.originalIndex;
      });
  }, [parsedEvents]);

  const resetAll = () => {
    setTextValue("");
    setImageUrls([]);
    setUploading(false);
    setParsing(false);
    setCreating(false);
    setParsedEvents([]);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remaining = 10 - imageUrls.length;
    if (remaining <= 0) {
      alert("最多上传10张图片");
      event.target.value = "";
      return;
    }

    const selectedFiles = files.slice(0, remaining);
    if (files.length > remaining) {
      alert("最多上传10张图片，超出部分已忽略");
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("上传失败");
          }

          const data = await response.json();
          return data.imageUrl as string;
        })
      );

      setImageUrls((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("批量上传图片失败:", error);
      alert("上传图片失败，请重试");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeParsedEvent = (idx: number) => {
    setParsedEvents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleParse = async () => {
    if (!canParse) return;

    setParsing(true);
    try {
      const response = await fetch("/api/batch-parse-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textValue,
          imageUrls,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "解析失败");
      }

      setParsedEvents(Array.isArray(result.events) ? result.events : []);
      if (!result.events || result.events.length === 0) {
        alert("未解析到活动，请补充文本或图片后重试");
      }
    } catch (error) {
      console.error("批量解析失败:", error);
      alert("解析失败，请重试");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!canConfirm) return;

    setCreating(true);
    try {
      const failedEvents: { index: number; title: string; reason: string }[] = [];
      const successIndices = new Set<number>();

      for (const [index, event] of parsedEvents.entries()) {
        if (!isValidExactDate(event.date)) {
          failedEvents.push({
            index,
            title: event.title,
            reason: `日期格式无效: ${event.date}`,
          });
          continue;
        }

        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            content: event.content,
            date: event.date,
            startHour: "00:00",
            endHour: "23:59",
            location: event.location,
            organizer: event.organizer,
            eventType: event.eventType,
            tags: event.tags,
            link: event.link,
            imageUrl: event.imageUrl,
            recurrenceRule: "none",
            requiredAttendees: null,
            datePrecision: "exact",
            approximateMonth: null,
          }),
        });

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            if (typeof errorData?.error === "string") {
              errorMessage = errorData.error;
            }
            if (typeof errorData?.details === "string") {
              errorMessage = `${errorMessage} (${errorData.details})`;
            }
          } catch {
            // ignore JSON parse error and use default HTTP message
          }

          failedEvents.push({
            index,
            title: event.title,
            reason: errorMessage,
          });
          continue;
        }

        successIndices.add(index);
      }

      if (successIndices.size > 0) {
        onSuccess?.();
      }

      if (failedEvents.length === 0) {
        onOpenChange(false);
        resetAll();
        return;
      }

      if (successIndices.size > 0) {
        const failedIndexSet = new Set(failedEvents.map((item) => item.index));
        setParsedEvents((prev) => prev.filter((_, i) => failedIndexSet.has(i)));
      }

      const failedSummary = failedEvents
        .slice(0, 3)
        .map((item) => `${item.title}: ${item.reason}`)
        .join("；");
      const more =
        failedEvents.length > 3 ? `；其余 ${failedEvents.length - 3} 条也失败` : "";

      alert(
        successIndices.size > 0
          ? `已成功创建 ${successIndices.size} 条，失败 ${failedEvents.length} 条。${failedSummary}${more}`
          : `批量创建失败，共 ${failedEvents.length} 条失败。${failedSummary}${more}`
      );
    } catch (error) {
      console.error("批量创建失败:", error);
      alert("批量创建失败，请重试");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          resetAll();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量创建活动</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <Textarea
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="输入活动文本，或仅上传图片进行解析"
              rows={5}
            />

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading || parsing || creating}
                  className="w-auto"
                />
                <span className="text-sm text-muted-foreground">最多10张</span>
              </label>

              <Button type="button" onClick={handleParse} disabled={!canParse}>
                {parsing ? "识别中..." : "智能识别"}
              </Button>
              <Button type="button" onClick={handleConfirmCreate} disabled={!canConfirm}>
                {creating ? "确定中..." : "确定创建活动"}
              </Button>
            </div>
          </div>

          {imageUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {imageUrls.map((url, index) => (
                <div key={`${url}-${index}`} className="relative rounded-md border overflow-hidden">
                  <img src={url} alt={`上传图片${index + 1}`} className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1"
                    aria-label="删除图片"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {parsedEvents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedParsedEventEntries.map(({ event, originalIndex }) => (
                <Card key={`${event.title}-${event.date}-${originalIndex}`} className="py-4">
                  <CardContent className="px-4 space-y-1 relative">
                    <button
                      type="button"
                      onClick={() => removeParsedEvent(originalIndex)}
                      disabled={creating}
                      className="absolute top-0 right-0 rounded-full bg-muted text-muted-foreground p-1 hover:bg-muted/80 disabled:opacity-50"
                      aria-label={`删除活动 ${event.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="text-sm text-muted-foreground">{event.date}</div>
                    <div className="text-base font-semibold">{event.title}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {uploading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Upload className="h-4 w-4" />
              图片上传中...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
