import { nanoid } from 'nanoid';
import type { EventImage, EventInput, EventRecord } from './schema';
import type { EventBlock, EventItem, FeaturedEventBlock } from '@/lib/newsletter/schema';

function imageSnapshot(event: EventRecord) {
  return event.image?.src
    ? {
        assetId: event.image.assetId,
        src: event.image.src,
        alt: event.image.alt,
        decorative: event.image.decorative ?? false,
      }
    : undefined;
}

export function eventRecordToItem(event: EventRecord, id = nanoid()): EventItem {
  return {
    id,
    sourceEventId: event.id,
    image: imageSnapshot(event),
    category: event.category,
    title: event.title,
    speakerName: event.speakerName,
    speakerRole: event.speakerRole,
    date: event.date,
    location: event.location,
    description: event.description,
    buttonLabel: event.buttonLabel,
    buttonUrl: event.buttonUrl,
  };
}

export function eventRecordToBlock(event: EventRecord, current: EventBlock): Partial<EventBlock> {
  const snapshot = eventRecordToItem(event, current.id);
  const { id: _id, ...fields } = snapshot;
  return fields;
}

export function eventRecordToFeaturedBlock(
  event: EventRecord,
  current: FeaturedEventBlock,
): Partial<FeaturedEventBlock> {
  return {
    sourceEventId: event.id,
    overline: event.category || current.overline,
    image: imageSnapshot(event),
    title: event.title,
    speakerName: event.speakerName,
    speakerRole: event.speakerRole,
    date: event.date,
    location: event.location,
    description: event.description,
    buttonLabel: event.buttonLabel,
    buttonUrl: event.buttonUrl,
  };
}

function imageInput(image: EventBlock['image'] | EventItem['image'] | FeaturedEventBlock['image']): EventImage {
  if (!image) return undefined;
  return {
    assetId: image.assetId,
    src: image.src,
    alt: image.alt,
    decorative: image.decorative ?? false,
  };
}

function eventSnapshotToInput(
  event: EventBlock | EventItem | FeaturedEventBlock,
  category: string | undefined,
): EventInput {
  return {
    category,
    title: event.title,
    speakerName: event.speakerName,
    speakerRole: event.speakerRole,
    date: event.date,
    location: event.location,
    description: event.description,
    buttonLabel: event.buttonLabel,
    buttonUrl: event.buttonUrl,
    image: imageInput(event.image),
  };
}

export function eventBlockToInput(block: EventBlock): EventInput {
  return eventSnapshotToInput(block, block.category);
}

export function eventItemToInput(item: EventItem): EventInput {
  return eventSnapshotToInput(item, item.category);
}

export function featuredEventBlockToInput(block: FeaturedEventBlock): EventInput {
  return eventSnapshotToInput(block, block.overline);
}
