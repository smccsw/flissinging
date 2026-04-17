import { defineField, defineType } from "sanity";

export default defineType({
  name: "recording",
  title: "Recording",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 }
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "text",
      rows: 3
    }),
    defineField({
      name: "order",
      title: "Sort order",
      type: "number",
      description: "Lower numbers appear first in the list.",
      initialValue: 0
    }),
    defineField({
      name: "audioFile",
      title: "Audio file",
      type: "file",
      description: "Upload when you are ready — processed to Sanity CDN URLs at publish time.",
      options: { accept: "audio/*" }
    }),
    defineField({
      name: "externalAudioUrl",
      title: "Or external audio URL",
      type: "url",
      description: "Optional. Use instead of a file upload (e.g. temporary hosted URL)."
    }),
    defineField({
      name: "playbackGain",
      title: "Playback / analyser gain",
      type: "number",
      initialValue: 1,
      validation: (Rule) => Rule.min(0.25).max(3)
    }),
    defineField({
      name: "licenseLabel",
      title: "License label",
      type: "string",
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: "licenseUrl",
      title: "License URL",
      type: "url",
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: "sourceUrl",
      title: "Source / credit URL",
      type: "url",
      validation: (Rule) => Rule.required()
    })
  ],
  validation: (Rule) =>
    Rule.custom((doc: { audioFile?: { asset?: { _ref?: string } }; externalAudioUrl?: string } | undefined) => {
      if (!doc) return true;
      const hasFile = Boolean(doc.audioFile?.asset);
      const hasUrl = Boolean(doc.externalAudioUrl);
      if (!hasFile && !hasUrl) return "Add an audio file or an external audio URL";
      return true;
    }),
  preview: {
    select: { title: "title", media: "audioFile" },
    prepare({ title }) {
      return { title: title || "Untitled", subtitle: "Recording" };
    }
  }
});
