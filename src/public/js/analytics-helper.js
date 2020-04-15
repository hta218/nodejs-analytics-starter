const SESSION_NAME = '__analytics_session'
const USER_NAME = '__analytics_user'

const SESSION_REFRESH_TIME = 15
const USER_REFRESH_TIME = 2 * 365 * 24 * 60 // 2 years

const COLLECT_DATA_INTERVAL = 2
const ANALYTICS_API = `/api/analytics`

const getCookie = name => {
	const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)')
	return v ? v[2] : null
}

const setCookie = (name, value, mins) => {
	const d = new Date()
	d.setTime(d.getTime() + 60 * 1000 * mins)
	document.cookie = name + '=' + value + ';path=/;expires=' + d.toUTCString()
}

const collectData = (eventData = {}) => {
	const sessionId = getCookie(SESSION_NAME)
	const userId = getCookie(USER_NAME)
	let sessionData = { 
    shopDomain: "test-shop", 
    sessionId,
    userId, 
    pageId: "page-1", 
    pageType: "page", 
    pageTitle: "Test Page" 
  }

	// const userData = getUserData()
	const userData = {}
	// Use new query parameter "t" each time making a request to prevent browser cache
  let queryStr = ''
  Object.entries({ ...sessionData, ...eventData, ...userData, t: new Date().getTime() }).forEach(([key, value]) => {
    queryStr += `${key}=${value}&`
  })

	const img = document.createElement('img')
	img.src = `${ANALYTICS_API}/collect?${queryStr}`
	setTimeout(() => img.remove(), 500)
}

const setupAnalyticsEventsTracking = () => {
	// const trackingIDElements = pfSetting.trackingIDs || []
	// trackingIDElements.forEach(elem => {
	// 	const $elem = document.getElementsByClassName(elem.elementId)[0]
	// 	if ($elem) {
	// 		$elem.addEventListener("click", () => collectData({ ...elem, count: 1 }))
	// 		setTimeout(() => {
	// 			collectData({ ...elem, count: 0 })
	// 		}, 1000)
	// 	}
	// })

	// const $productFields = document.querySelectorAll('[data-pf-type="ProductATC"], [data-pf-type="ProductViewDetails"]')
	// $productFields.forEach($elem => {
	// 	const eventData = {
	// 		elementId: "id",
	// 		elementType: $elem.getAttribute('data-pf-type')
	// 	}
	// 	$elem.addEventListener("click", () => collectData({ ...eventData, count: 1 }))
	// })
}

const updateCookies = () => {
	let sessionId = getCookie(SESSION_NAME)
	let userId = getCookie(USER_NAME)

	if (!sessionId) { sessionId = "sessionId" }
	if (!userId) { userId = "userId" }

	/**
	 * How long user's id in cookie last:
	 * https://www.bounteous.com/insights/2019/12/23/how-google-analytics-uses-cookies-identify-users/
	 *
	 *  -- Leo
	 */
	setCookie(USER_NAME, userId, USER_REFRESH_TIME)
	setCookie(SESSION_NAME, sessionId, SESSION_REFRESH_TIME)
}

function isTrackingActive() {
	let isActive = true

	return isActive
}

initPageFlyAnalytics = () => {
	try {
		window.addEventListener('load', function () {
			const isActive = isTrackingActive()
			if (!isActive) { return }

			console.info("Init analytics script")
			updateCookies()

			collectData()
			setupAnalyticsEventsTracking()

			setInterval(() => {
				updateCookies()
				collectData()
			}, COLLECT_DATA_INTERVAL * 60 * 1000)
		})
	} catch (err) {
		console.error('Initialize analytics failed!!', err)
	}
}

initPageFlyAnalytics()