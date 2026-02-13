import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    try {
      	const body = await request.json();
      	const inputUrl = body.url;

		let currentUrl = inputUrl;
		const maxHops = 10;
		let hopCount = 0;
		const chain = [];
		let redirectLoopDetected = false;
		const visitedUrls = new Set<string>();

		let finalResponse = null;

		while (hopCount < maxHops) {
			if (visitedUrls.has(currentUrl)) {
				redirectLoopDetected = true;
				break;
			}
			visitedUrls.add(currentUrl);

			try {
				const response = await fetch(currentUrl, {
					method: 'GET',
					redirect: 'manual',
					headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; AstroUrlChecker/1.0)'
					}
				});

				const status = response.status;
				const headers = Object.fromEntries(response.headers.entries());
				const isRedirect = status >= 300 && status < 400;
				const locationHeader = response.headers.get('location');

				const hopData = {
					hop: hopCount + 1,
					url: currentUrl,
					status: status,
					statusText: response.statusText || (isRedirect ? 'Redirect' : 'OK'),
					redirectTo: isRedirect && locationHeader ? new URL(locationHeader, currentUrl).toString() : null,
					headers: {
					'content-type': headers['content-type'],
					'server': headers['server']
					}
				};

				chain.push(hopData);

				if (isRedirect && locationHeader) {
					currentUrl = new URL(locationHeader, currentUrl).toString();
					hopCount++;
				} else {
					finalResponse = hopData;
					break;
				}
			} catch (fetchError) {
				return new Response(JSON.stringify({ error: `Failed to fetch ${currentUrl}`, details: fetchError }), { status: 500 });
			}
		}

		const result = {
			inputUrl: inputUrl,
			redirectCount: chain.length - 1 < 0 ? 0 : (chain.length - 1),
			maxHops: maxHops,
			maxHopsReached: hopCount >= maxHops,
			redirectLoopDetected: redirectLoopDetected,
			final: {
				url: finalResponse ? finalResponse.url : currentUrl,
				status: finalResponse ? finalResponse.status : null,
				statusText: finalResponse ? finalResponse.statusText : 'Unknown',
				headers: finalResponse ? finalResponse.headers : {}
			},
			chain: chain
		};

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
			'Content-Type': 'application/json'
			}
		});

    } catch (error) {
    	return new Response(
			JSON.stringify({ error: 'Server error processing request' }), 
			{ status: 500 }
		);
    }
};