import { useState, useEffect } from 'preact/hooks'
import LineGraph from './components/Line'

export function App() {
	const [datasets, setDatasets] = useState([])

	useEffect(() => {
		fetch('http://localhost:8080/ips')
			.then(async (res) => {
				setDatasets(await res.json())
			})
			.catch((err) => {
				console.error(err)
			})
	}, [])
	return (
		<>
			{datasets.map((dataset) => <LineGraph key={dataset} file_name={dataset} />)}
			{/* {datasets.length > 0 &&
				<LineGraph file_name={datasets[0]} />
			} */}
		</>
	)
}
