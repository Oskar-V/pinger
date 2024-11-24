import { useEffect, useState } from "preact/hooks"
import Chart from 'react-apexcharts'

const LineGraph = (props: any) => {
	const { file_name } = props
	const max_length = 240
	const update_frequency = 1e4;
	const [data, setData] = useState<number[][]>([]);
	const [last_timestamp, setLastTimestamp] = useState(0);
	const [trigger, setTrigger] = useState<boolean>(false);
	useEffect(() => {
		let timeout: number;
		fetch(`http://localhost:8080/data?${file_name}=${last_timestamp}`)
			.then(async (res) => {
				const tmp = (await res.json())[file_name] as number[][];
				if (tmp.length === 0) {
					throw new Error('Received no data from server - retrying in 10s')
				}
				setData((prev) => {
					const arr = [...(tmp.map(([timestamp, ping]) => [timestamp * 1000, ping])), ...prev]
					if (arr.length > max_length)
						return arr.slice(0, max_length)
					return arr
				});
				// Set up a timeout to update the last timestamp in 10 seconds also re-triggering this useEffect
				timeout = setTimeout(() => {
					setLastTimestamp(tmp[0][0])
				}, update_frequency);
			}).catch((err) => {
				console.error(err)
				timeout = setTimeout(() => {
					setTrigger((prev) => !prev) // Just toggle the trigger to re-trigger the useEffect
				}, update_frequency)
			})

		return () => clearTimeout(timeout as number); // Cleanup on component unmount
	}, [last_timestamp, trigger])

	useEffect(() => {
		console.log(data.length)
	}, [data])

	return <Chart
		options={{
			title: {
				text: file_name,
				align: 'center'
			},
			chart: {
				type: "area",
				toolbar: {
					show: false
				}
			},
			xaxis: {
				type: "datetime",
			},
			yaxis: {
				title: {
					text:'Ping'
				},
				min: 0
			},
			stroke: {
				width: 2,
				curve: "smooth",
				colors: ['#0f0']
			},
			fill: {
				type: "gradient",
				gradient: {
					type: 'vertical',
					shadeIntensity: 1,
					opacityFrom: 1,
					opacityTo: 1,
					gradientToColors:['#f00']
				}
			},
			tooltip: {
				shared: false,
				y: {
					formatter: (val) => `${val} ms`
				},
				x: {
					formatter: (val) => `T - ${Math.round((Date.now() - val) / 1e3 + 3600 * 2)} seconds`
				}
			}
		}}
		series={[{ name: "Response", data }]}
		type="line"
		width="100%"
		height={350}
	/>
}

export default LineGraph