import express, { Request, Response } from 'express'
import { getAnalyticsData, saveSession } from '../models/Analytics'
import { saveEvent } from '../models/AnalyticsEvent'
import { fillAnalyticsData } from '../util/helpers'
import { verifyReq } from '../util/middleware'
import { format, add, sub } from 'date-fns'

const router = express.Router()
const TRANSPARENT_GIF_BUFFER = Buffer.from('R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=', 'base64')

router.get('/collect', async (req, res) => {
	/**
	 * Why using a gif?
	 *
	 * Ref: https://stackoverflow.com/questions/2083043/why-does-google-analytic-request-a-gif-file
	 * Or: https://stackoverflow.com/questions/4170190/why-does-google-analytics-use-utm-gif
	 *    https://developers.google.com/analytics/resources/concepts/gaConceptsTrackingOverview?hl=en
	 *
	 * -- Leo
	 */
	res.writeHead(200, {
		'Content-Type': 'image/gif',
		'cache-control': 'no-cache, no-store, must-revalidate',
		pragma: 'no-cache',
		expires: new Date('1990').toUTCString(),
		date: new Date().toUTCString(),
		'last-modified': new Date('1991').toUTCString(),
		age: 2141853

	})
	res.end(TRANSPARENT_GIF_BUFFER, 'binary')
	try {
		let savedDoc
		const doc = req.query

		if (doc.elementId) {
			savedDoc = await saveEvent(doc)
		} else {
			savedDoc = await saveSession(doc)
		}

		if (!savedDoc) {
			console.error(`Failed to save doc! ${doc.shopDomain} -- ${doc.sessionId} -- ${doc.pageId}`)
		}
	} catch (e) {
		console.error(e)
	}

})

router.get("/data", [verifyReq], async (req: Request, res: Response) => {
	const { shopDomain } = req.query;
	const startDate = format(sub(new Date(), { days: 1 }), "yyyy-MM-dd")
	const endDate = format(add(new Date(), { days: 1 }), "yyyy-MM-dd")

  try {
    const raw: any = await getAnalyticsData(shopDomain, startDate, endDate);
    const data = fillAnalyticsData(raw, startDate, endDate);

    res.json({ success: 1, data });
  } catch (err) {
    console.error("Analytics Error :::: ", shopDomain, err);
    res.json({ success: 0, err: err.toString() });
  }
});

export default router;
