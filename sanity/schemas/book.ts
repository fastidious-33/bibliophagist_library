import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  fields: [
    defineField({
      name: 'bookId',
      title: 'Book ID',
      type: 'number',
      description: 'Original ID from the source spreadsheet, kept for reference.',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
    }),
    defineField({
      name: 'theme',
      title: 'Theme',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      description: 'Currently only populated for Comics & Graphic Novels entries.',
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'publishingDate',
      title: 'Publishing year',
      type: 'string',
      description: 'The book\u2019s original publication year (e.g. "1966"). Plain text, not a date \u2014 only the year is ever actually known.',
    }),
    defineField({
      name: 'publisher',
      title: 'Publisher',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: 'Book blurb/synopsis \u2014 distinct from Notes, which is for the group\u2019s own commentary.',
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      description: '0-5, half-points allowed',
      validation: (Rule) => Rule.min(0).max(5),
    }),
    defineField({
      name: 'coverUrl',
      title: 'Cover image URL',
      type: 'url',
      description: 'Auto-fetched from Open Library where available. Paste a different URL here to override.',
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
      rows: 3,
      description: 'The group\u2019s own notes/commentary on this book \u2014 distinct from Description.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'Used in the book\u2019s URL, e.g. /catalog/the-vegetarian. Click "Generate" to create one from the title.',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'author' },
  },
});