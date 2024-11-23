import { useEffect, useState } from "preact/hooks"
import Chart from 'react-apexcharts'

const LineGraph = (props: any) => {
	const { file_name } = props
	const max_length = 120
	const update_frequency = 1e4;
	const [data, setData] = useState<number[][]>([]);
	const [last_timestamp, setLastTimestamp] = useState(0);
	const [trigger, setTrigger] = useState<boolean>(false);
	useEffect(() => {
		let timeout: number;
		fetch(`http://localhost:8080/data?${file_name}=${last_timestamp}`)
			.then(async (res) => {
				const tmp = (await res.json())[file_name];
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
			chart: {
				type: "area"
			},
			xaxis: {
				type: "datetime",
			},
			stroke: {
				width: 1,
				curve: "smooth"
			}
		}}
		series={[{ data }]}
		type="line"
		width="100%"
	/>
}

export default LineGraph