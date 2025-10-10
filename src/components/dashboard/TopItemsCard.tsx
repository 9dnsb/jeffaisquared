interface TopItem {
  location_id: string
  location_name: string
  item_name: string
  total_quantity: number
  total_revenue: number
  rank_position: number
}

interface TopItemsCardProps {
  data: TopItem[]
}

export default function TopItemsCard({ data }: TopItemsCardProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  // Group items by location
  const itemsByLocation = data.reduce((acc, item) => {
    if (!acc[item.location_id]) {
      acc[item.location_id] = {
        name: item.location_name,
        items: [],
      }
    }
    acc[item.location_id].items.push(item)
    return acc
  }, {} as Record<string, { name: string; items: TopItem[] }>)

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600'
      case 2:
        return 'from-gray-300 to-gray-500'
      case 3:
        return 'from-orange-400 to-orange-600'
      default:
        return 'from-blue-400 to-blue-600'
    }
  }

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return '🏅'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Top Selling Items</h2>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
          Today
        </div>
      </div>

      {Object.keys(itemsByLocation).length === 0 ? (
        <p className="text-gray-400 text-center py-8">No items data available</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(itemsByLocation).map(([locationId, location]) => (
            <div key={locationId} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {location.name}
              </h3>
              <div className="space-y-2">
                {location.items.map((item) => {
                  const maxQuantity = Math.max(...location.items.map((i) => i.total_quantity))
                  const barWidth = (item.total_quantity / maxQuantity) * 100

                  return (
                    <div
                      key={`${item.location_id}-${item.rank_position}`}
                      className="group relative"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          <span className="text-2xl">{getMedalEmoji(item.rank_position)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold text-gray-900 truncate">
                              {item.item_name}
                            </span>
                            <span className="text-sm font-medium text-gray-600 ml-2">
                              {formatCurrency(item.total_revenue)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`bg-gradient-to-r ${getMedalColor(
                                  item.rank_position
                                )} h-full rounded-full transition-all duration-500`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 min-w-[4rem] text-right">
                              {item.total_quantity.toLocaleString()} sold
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
