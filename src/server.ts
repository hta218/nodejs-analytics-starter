import fs from 'fs'
import https from 'https'
import app from './app'
import { ssl_crt_path, ssl_key_path } from './configs'

const server = app.listen(app.get('port'), () => {
	console.log(
		'  App is running at http://localhost:%d in %s mode',
		app.get('port'),
		app.get('env')
	)
	console.log('  Press CTRL-C to stop\n')
})


if (process.env.HTTPS === 'true') {
	console.info('https enabled')

	if (fs.existsSync(ssl_key_path) && fs.existsSync(ssl_crt_path)) {
		const HTTPS_PORT = process.env.HTTPS_PORT

		https
			.createServer(
				{
					key: fs.readFileSync(ssl_key_path),
					cert: fs.readFileSync(ssl_crt_path)
				},
				app
			)
			.listen(HTTPS_PORT)
		console.log(
			`%s App listening on https port: ${HTTPS_PORT}`,
			'✓'
		)
	} else {
		console.info('no https')
	}
}


export default server
