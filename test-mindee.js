const imageUrl = "https://www.w3.org/People/mimasa/test/imgformat/img/w3c_home.jpg";
const apiKey = "md_g7miVBMFQIokshp58jCk4wDFxa8Arw4_wa-FWszIdhs";
const modelId = "2487ad11-895f-4635-8629-f2d7a254b6a5";

async function testMindee() {
  const url = "https://api-v2.mindee.net/v2/products/extraction/enqueue";
  
  const body = JSON.stringify({ 
    model_id: modelId,
    url: imageUrl 
  });

  try {
    console.log("Testing POST", url);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Job:", JSON.stringify(json, null, 2));

    if (json.job && json.job.polling_url) {
      let pollingUrl = json.job.polling_url;
      let isProcessing = true;
      let finalResult = null;
      
      while (isProcessing) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("Polling...", pollingUrl);
        const pollRes = await fetch(pollingUrl, {
          headers: {
            'Authorization': apiKey,
          }
        });
        const pollJson = await pollRes.json();
        console.log("Poll Response:", JSON.stringify(pollJson, null, 2));
        if (pollJson.status === "Completed" || (pollJson.job && pollJson.job.status === "Completed")) {
          isProcessing = false;
          finalResult = pollJson;
          console.log("Completed Result:", JSON.stringify(finalResult, null, 2));
        } else if (pollJson.job.status === "Failed") {
          isProcessing = false;
          console.error("Job failed:", pollJson);
        }
      }
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testMindee();
