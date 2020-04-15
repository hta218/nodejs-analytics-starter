import mongoose, { Document } from "mongoose";
import { format } from "date-fns";

interface AnalyticsDocument extends Document {
  sessionId: string;
  userId: string;
  shopDomain: string;
  pageId: string;
  pageType: string;
  pageTitle: string;
  date: string;
  events: string[];
  // Same value as date
  startTime: number; // time stamp
  endTime: number;
}

const analyticsSchema = new mongoose.Schema({
  shopDomain: {
    type: String,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  userId: String,
  pageType: String,
  pageTitle: String,
  pageId: String,
  date: {
    type: String,
    index: true
  },
  events: [{
    type: mongoose.Types.ObjectId,
    ref: "AnalyticsEvent"
  }],
  // Same value as date
  startTime: Number,
  endTime: Number,
});

const Analytics = mongoose.model<AnalyticsDocument>("Analytics", analyticsSchema);

function findSession(session: AnalyticsDocument): Promise<AnalyticsDocument> {
  const { sessionId, pageId } = session;
  return new Promise((resolve, reject) => {
    Analytics
      .findOne({ sessionId, pageId })
      .then(resolve)
      .catch(reject);
  });
}

export function saveSession(session: AnalyticsDocument): Promise<AnalyticsDocument> {
  return new Promise((resolve, reject) => {
    findSession(session).then(currSession => {
      if (!currSession) {
        const newSession = new Analytics(session);
        const currDate = new Date();

        newSession.date = format(currDate, "yyyy-MM-dd")
        newSession.startTime = currDate.getTime();
        newSession.endTime = currDate.getTime();

        newSession
          .save()
          .then(resolve)
          .catch(reject);
      } else {
        const endTime = new Date().getTime();

        currSession.endTime = endTime;
        currSession.pageType = session.pageType;
        currSession.pageTitle = session.pageTitle;
        
        currSession
          .save()
          .then(resolve)
          .catch(reject);
      }
    }).catch(reject);
  });
}

export function updateSessionEvents(sessionId: string, eventId: string): Promise<AnalyticsDocument> {
  return new Promise((resolve, reject) => {
    Analytics
      .findOne({ sessionId })
      .then(session => {
        const { events } = session;
        if (!events.includes(eventId)) {
          session.events.push(eventId);
        }
        session
          .save()
          .then(resolve)
          .catch(reject);
      }).catch(reject);
  });
}

export function getAnalyticsData(shopDomain: string, startDate: string, endDate: string) {
  const startTime = new Date(`${startDate}T00:00:00`).getTime();
  const endTime = new Date(`${endDate}T23:59:59`).getTime();
  const PF_TRACKING_ELEMENTS = ["Slider", "Heading", "Button", "Image2"]

  return new Promise((resolve, reject) => {
    Analytics
      .aggregate([
        // Match sessions by shopDomain and date ranges
        {
          "$match": {
            "$and": [
              { "shopDomain": shopDomain },
              { "startTime": { "$gte": startTime, "$lte": endTime } },
            ]
          },
        },
        // Calculate session duration
        {
          "$addFields": {
            "sessionDuration": { "$round": { "$divide": [{ "$subtract": ["$endTime", "$startTime"] }, 1000] } }
          }
        },
        // Group all docs by pageId and date, add users and events arrays
        {
          "$group": {
            "_id": {
              "pageId": "$pageId",
              "pageType": "$pageType",
              "pageTitle": "$pageTitle",
              "date": "$date"
            },
            "sessions": { "$push": "$$ROOT", },
            "users": { "$addToSet": "$userId" },
            "events": { "$push": "$events" }
          }
        },
        // Filter bounced sessions and concat events
        {
          "$addFields": {
            "sessionCount": { "$size": "$sessions" },
            "boucedSessions": {
              "$filter": {
                "input": "$sessions",
                "as": "session",
                "cond": {
                  "$and": [
                    { "$eq": ["$$session.sessionDuration", 0] },
                    { "$eq": [{ "$size": "$$session.events" }, 0] }
                  ]
                }
              }
            },
            "events": {
              "$reduce": {
                "input": "$events",
                "initialValue": [],
                "in": {
                  "$concatArrays": ["$$value", "$$this"]
                }
              }
            }
          }
        },
        // Populate Analytics Events collection, filter atcEvents and productViews events
        {
          "$lookup": {
            "from": "analyticsevents",
            "localField": "events",
            "foreignField": "_id",
            "as": "events"
          }
        },
        {
          "$addFields": {
            "atcEvents": {
              "$filter": {
                "input": "$events",
                "as": "event",
                "cond": {
                  "$eq": ["$$event.elementType", "ProductATC"]
                }
              }
            },
            "productViewEvents": {
              "$filter": {
                "input": "$events",
                "as": "event",
                "cond": {
                  "$eq": ["$$event.elementType", "ProductViewDetails"]
                }
              }
            },
            "crEvents": {
              "$filter": {
                "input": "$events",
                "as": "event",
                "cond": {
                  "$in": ["$$event.elementType", PF_TRACKING_ELEMENTS]
                }
              }
            },
          }
        },
        // Calculate visitors, avgSessionDuration, bounceRate, ATC & ProductView ratios
        // And remove unnecessary fields
        {
          "$project": {
            "_id": 1,
            "date": "$_id.date",
            "sessionCount": 1,
            "crEvents": 1,
            "visitors": { "$size": "$users" },
            "TOTAL_avgSessionDuration": {
              "$reduce": {
                "input": "$sessions",
                "initialValue": 0,
                "in": { "$add": ["$$value", "$$this.sessionDuration"] },
              }
            },
            "TOTAL_bounceRate": { "$multiply": [{ "$size": "$boucedSessions" }, 100] },
            "TOTAL_addToCart": {
              "$multiply": [
                {
                  "$reduce": {
                    "input": "$atcEvents",
                    "initialValue": 0,
                    "in": { "$add": ["$$value", "$$this.count"] }
                  }
                },
                100
              ]
            },
            "TOTAL_productViews": {
              "$multiply": [
                {
                  "$reduce": {
                    "input": "$productViewEvents",
                    "initialValue": 0,
                    "in": { "$add": ["$$value", "$$this.count"] }
                  }
                },
                100
              ]
            }
          }
        },
        {
          "$unset": "_id.date"
        },
        // Sort by dates
        {
          "$sort": { "date": 1 }
        },
        {
          "$addFields": {
            "avgSessionDuration": { "$divide": ["$TOTAL_avgSessionDuration", "$sessionCount"] },
            "bounceRate": { "$divide": ["$TOTAL_bounceRate", "$sessionCount"] },
            "addToCart": { "$divide": ["$TOTAL_addToCart", "$sessionCount"] },
            "productViews": { "$divide": ["$TOTAL_productViews", "$sessionCount"] },
          }
        },
        // Group by pageId
        {
          "$group": {
            "_id": "$_id",
            "sessionCount": { "$push": "$sessionCount" },
            "dates": { "$push": "$date" },
            "avgSessionDuration": { "$push": { "$round": "$avgSessionDuration" } },
            "bounceRate": { "$push": { "$round": ["$bounceRate", 2] } },
            "visitors": { "$push": "$visitors" },
            "addToCart": { "$push": { "$round": ["$addToCart", 2] } },
            "productViews": { "$push": { "$round": ["$productViews", 2] } },
            "crEvents": { "$push": "$crEvents" },
            "TOTAL_avgSessionDuration": { "$push": "$TOTAL_avgSessionDuration" },
            "TOTAL_bounceRate": { "$push": "$TOTAL_bounceRate" },
            "TOTAL_addToCart": { "$push": "$TOTAL_addToCart" },
            "TOTAL_productViews": { "$push": "$TOTAL_productViews" },
          }
        },
        {
          "$addFields": {
            "TOTAL_Session": { "$sum": "$sessionCount" }
          }
        },
        {
          "$addFields": {
            "TOTAL": {
              "session": "$TOTAL_Session",
              "avgSessionDuration": { "$round": [{ "$divide": [{ "$sum": "$TOTAL_avgSessionDuration" }, "$TOTAL_Session"] }, 2] },
              "bounceRate": { "$round": [{ "$divide": [{ "$sum": "$TOTAL_bounceRate" }, "$TOTAL_Session"] }, 2] },
              "addToCart": { "$round": [{ "$divide": [{ "$sum": "$TOTAL_addToCart" }, "$TOTAL_Session"] }, 2] },
              "productViews": { "$round": [{ "$divide": [{ "$sum": "$TOTAL_productViews" }, "$TOTAL_Session"] }, 2] },
              "visitors": { "$sum": "$visitors" }
            }
          }
        },
        // Refine atcEvents array
        {
          "$project": {
            "_id": 1,
            "sessionCount": 1,
            "dates": 1,
            "avgSessionDuration": 1,
            "bounceRate": 1,
            "visitors": 1,
            "addToCart": 1,
            "productViews": 1,
            "TOTAL": 1,
            "crEvents": {
              "$reduce": {
                "input": "$crEvents",
                "initialValue": [],
                "in": {
                  "$concatArrays": ["$$value", "$$this"]
                }
              }
            }
          }
        },
        // Caculate each atc conversion-rate
        {
          "$unwind": {
            "path": "$crEvents",
            "preserveNullAndEmptyArrays": true
          }
        },
        {
          "$addFields": {
            "elementId": { "$ifNull": ["$crEvents.elementId", "$_id"] },
            "elementName": { "$ifNull": ["$crEvents.elementName", "$_id"] },
            "atcCount": { "$ifNull": ["$crEvents.count", -1] },
          }
        },
        {
          "$unset": "crEvents"
        },
        {
          "$group": {
            "_id": {
              "elementId": "$elementId",
              "elementName": "$elementName"
            },
            "count": { "$sum": "$atcCount" },
            "page": { "$push": "$$ROOT" }
          }
        },
        {
          "$replaceRoot": {
            "newRoot": {
              "$mergeObjects": [
                { "$arrayElemAt": ["$page", 0] },
                {
                  "conversionRate": {
                    "elementId": "$_id.elementId",
                    "elementName": "$_id.elementName",
                    "count": "$count"
                  }
                }
              ]
            }
          }
        },
        {
          "$group": {
            "_id": {
              "page": "$_id",
              "sessionCount": "$sessionCount",
              "dates": "$dates",
              "avgSessionDuration": "$avgSessionDuration",
              "bounceRate": "$bounceRate",
              "visitors": "$visitors",
              "addToCart": "$addToCart",
              "productViews": "$productViews",
              "TOTAL": "$TOTAL",
            },
            "conversionRateLabels": {
              "$push": "$conversionRate.elementName"
            },
            "conversionRateValues": {
              "$push": { "$round": [{ "$multiply": [{ "$divide": ["$conversionRate.count", "$TOTAL.session"] }, 100] }, 2] }
            }
          }
        },
        {
          "$addFields": {
            "noConversionRate": {
              "$cond": {
                "if": { "$lt": [{ "$arrayElemAt": ["$conversionRateValues", 0] }, 0] },
                "then": true,
                "else": false
              }
            }
          }
        },
        {
          "$unset": "_id.TOTAL.session"
        },
        // Extract final data
        {
          "$project": {
            "_id": "$_id.page.pageId",
            "type": "$_id.page.pageType",
            "title": "$_id.page.pageTitle",
            "dates": "$_id.dates",
            "avgSessionDuration": "$_id.avgSessionDuration",
            "bounceRate": "$_id.bounceRate",
            "visitors": "$_id.visitors",
            "addToCart": "$_id.addToCart",
            "productViews": "$_id.productViews",
            "conversionRate": {
              "labels": { "$cond": [{ "$eq": ["$noConversionRate", true] }, [], "$conversionRateLabels"] },
              "values": { "$cond": [{ "$eq": ["$noConversionRate", true] }, [], "$conversionRateValues"] }
            },
            "totals": {
              "$mergeObjects": [
                "$_id.TOTAL",
                {
                  "conversionRate": {
                    "$cond": [
                      { "$eq": ["$noConversionRate", true], },
                      0,
                      { "$sum": "$conversionRateValues" }
                    ]
                  }
                }
              ]
            }
          }
        }
      ])
      .exec()
      .then(resolve)
      .catch(reject);
  });
}

export default Analytics;