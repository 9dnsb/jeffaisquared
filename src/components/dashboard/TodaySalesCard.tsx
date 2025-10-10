interface LocationSales {
  location_id: string
  location_name: string
  total_sales: number
  order_count: number
}

interface TodaySalesCardProps {
  data: LocationSales[]
}

export default function TodaySalesCard({ data }: TodaySalesCardProps) {
  const totalSales = data.reduce((sum, loc) => sum + loc.total_sales, 0)
  const totalOrders = data.reduce((sum, loc) => sum + loc.order_count, 0)

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Today&apos;s Sales</h2>
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          Live
        </div>
      </div>

      {/* Total Overview */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Total Revenue</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-900">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1">Total Orders</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-purple-900">{totalOrders}</p>
        </div>
      </div>

      {/* Location Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          By Location
        </h3>
        {data.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No sales data available</p>
        ) : (
          data.map((location) => {
            const percentage = totalSales > 0 ? (location.total_sales / totalSales) * 100 : 0
            return (
              <div
                key={location.location_id}
                className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-900">{location.location_name}</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(location.total_sales)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 min-w-[3rem] text-right">
                    {location.order_count} orders
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
