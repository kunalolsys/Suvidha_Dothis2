import React from 'react'

const StatCard2t = ({ title, value, icon: Icon, color = 'blue', trend }) => {
    const colorVariants = {
        blue: {
            bg: 'bg-blue-100',
            text: 'text-blue-600',
        },
        red: {
            bg: 'bg-red-100',
            text: 'text-red-600',
        },
        green: {
            bg: 'bg-green-100',
            text: 'text-green-600',
        },
        yellow: {
            bg: 'bg-yellow-100',
            text: 'text-yellow-600',
        },
        purple: {
            bg: 'bg-purple-100',
            text: 'text-purple-600',
        },
    };

    const selectedColor = colorVariants[color] || colorVariants.blue;

    return (
        <>
            <div className="bg-white rounded-xl p-4 shadow-sm ">
                <div className="flex items-center justify-around">
                    <div className={`p-3 rounded-full ${selectedColor.bg}`}>
                        <Icon className={`w-6 h-6 ${selectedColor.text}`} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        <p className="text-md font-medium text-gray-600 mb-1">{title}</p>
                        {trend && (
                            <p className={`text-sm ${trend.color} mt-1`}>
                                {trend.value} {trend.label}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default StatCard2t