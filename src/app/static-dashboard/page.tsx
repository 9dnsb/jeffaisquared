'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import Navbar from '@/components/navbar/Navbar'
import { useSession } from '@/hooks/useSession'
import TodaySalesCard from '@/components/dashboard/TodaySalesCard'
import TopItemsCard from '@/components/dashboard/TopItemsCard'

interface LocationSales {
  location_id: string
  location_name: string
  total_sales: number
  order_count: number
}

interface TopItem {
  location_id: string
  location_name: string
  item_name: string
  total_quantity: number
  total_revenue: number
  rank_position: number
}

export default function StaticDashboardPage() {
  const router = useRouter()
  const { loading } = useSession({
    onUnauthenticated: () => router.push('/auth/login')
  })

  const [salesData, setSalesData] = useState<LocationSales[]>([])
  const [topItemsData, setTopItemsData] = useState<TopItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    const fetchDashboardData = async () => {
      try {
        setDataLoading(true)
        setErrorMsg(null)

        const [salesResponse, itemsResponse] = await Promise.all([
          fetch('/api/dashboard/today-sales'),
          fetch('/api/dashboard/top-items'),
        ])

        if (!salesResponse.ok || !itemsResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const salesJson = await salesResponse.json()
        const itemsJson = await itemsResponse.json()

        setSalesData(salesJson.data || [])
        setTopItemsData(itemsJson.data || [])
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setDataLoading(false)
      }
    }

    fetchDashboardData()
  }, [loading])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sales Dashboard</h1>
            <p className="text-gray-600">Real-time insights into your business performance</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {errorMsg}
            </div>
          )}

          {dataLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TodaySalesCard data={salesData} />
              <TopItemsCard data={topItemsData} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
