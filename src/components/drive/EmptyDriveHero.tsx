import DriveHeader from "./DriveHeader";
import DriveTabs from "./DriveTabs";

export default function EmptyDriveHero({ onAdd }: { onAdd: () => void }) {
    return (
        <>
            <DriveHeader totalEvents={0} />
            <DriveTabs active="galleries" showTrash={false} />
            <div className="text-center py-20">
                <h2 className="text-3xl font-semibold mb-3">
                    Cloud drive for your clients
                </h2>

                <p className="text-gray-600 max-w-xl mx-auto mb-8">
                    Share photos with clients in a beautiful way and develop word-of-mouth marketing
                </p>

                <div className="flex justify-center items-center gap-6 mb-10">
                    <button
                        onClick={onAdd}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
                    >
                        + Add gallery
                    </button>

                    <a href="#" className="text-blue-500 hover:underline">
                        How to create a gallery
                    </a>
                </div>

                {/* Video Placeholder */}
                <div className="max-w-3xl mx-auto">
                    <div className="aspect-video bg-black rounded-xl shadow-lg flex items-center justify-center text-white">
                        Video instruction
                    </div>
                </div>

            </div>
        </>
    );
}
