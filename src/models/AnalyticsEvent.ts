import mongoose, { Document } from "mongoose";
import { updateSessionEvents } from "./Analytics";

interface EventDocument extends Document {
  shopDomain: string;
  sessionId: string;
  type: string;
  count: number;
  elementType: string;
  elementName: string;
  elementId: string;
  time: number;
}

const eventSchema = new mongoose.Schema({
  shopDomain: String,
  sessionId: {
    type: String,
    index: true
  },
  type: {
    type: String,
    default: "click"
  },
  count: Number,
  elementId: {
    type: String,
    index: true
  },
  elementType: String,
  elementName: String,
  time: Number
});

const AnalyticsEvent = mongoose.model<EventDocument>("AnalyticsEvent", eventSchema);

function findEvent(sessionId: string, elementId: string): Promise<EventDocument> {
  return new Promise((resolve, reject) => {
    AnalyticsEvent
      .findOne({ sessionId, elementId })
      .then(resolve)
      .catch(reject);
  });
}

export function saveEvent(event: any): Promise<EventDocument> {
  return new Promise((resolve, reject) => {
    const { sessionId, elementId } = event;

    findEvent(sessionId, elementId)
      .then(foundEvent => {
        if (!foundEvent) {
          const newEvent = new AnalyticsEvent(event);
          newEvent.time = new Date().getTime()

          newEvent
            .save()
            .then(savedEvent => {
              updateSessionEvents(sessionId, newEvent._id);
              resolve(savedEvent);
            })
            .catch(reject);
        } else {
          foundEvent.count += parseInt(event.count || 0);
          foundEvent.elementName = event.elementName;
          
          foundEvent
            .save()
            .then(resolve)
            .catch(reject);
        }
      }).catch(reject);
  });
}