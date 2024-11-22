import { serve } from "bun";

serve({
  port: 8080,
  fetch(req) {
    if (req.url.includes("/events")) {
			console.log("Starting to serve a new client")
      const abortController = new AbortController();
      const signal = abortController.signal;

      const stream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
						try {
							const data = `data: ${new Date().toLocaleTimeString()}\n`;
							controller.enqueue(new TextEncoder().encode(data));
						} catch (error) {
							console.log("Abrupt closure of connection");
							console.error(error);
							clearInterval(interval);
							controller.close();
						}
          }, 1000);

          // Listen for the abort event to clean up
          signal.addEventListener("abort", () => {
						console.log("Stopped serving a client")
            clearInterval(interval);
            controller.close();
          });
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

		if (req.url.includes('/history')) {
			return new Response()
		}

    return new Response("Not Found", { status: 404 });
  },
});
