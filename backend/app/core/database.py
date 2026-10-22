import logging
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_helper = Database()

INITIAL_SITES = [
    {
        "site_code": "BSG_NINH_THUAN",
        "code_nm": "NT-77C9D48E177535414FC805FF",
        "site_name": "BSG Ninh Thuận",
        "location": "Ninh Thuận",
        "subnet_ranges": [],
        "agent_status": "offline",
        "last_heartbeat": None,
        "device_stats": {"total": 0, "online": 0, "slow": 0, "offline": 0},
        "created_at": datetime.now(timezone.utc)
    },
    {
        "site_code": "BSG_PHU_LY",
        "code_nm": "PL-7BA3DF7289959A03A2ACDF03",
        "site_name": "BSG Phủ Lý",
        "location": "Hà Nam",
        "subnet_ranges": [],
        "agent_status": "offline",
        "last_heartbeat": None,
        "device_stats": {"total": 0, "online": 0, "slow": 0, "offline": 0},
        "created_at": datetime.now(timezone.utc)
    },
    {
        "site_code": "NM_BINH_DUONG",
        "code_nm": "BD-C3687A972CB91B18CCAD167A",
        "site_name": "NM-Binh Duong",
        "location": "Bình Dương",
        "subnet_ranges": [],
        "agent_status": "offline",
        "last_heartbeat": None,
        "device_stats": {"total": 0, "online": 0, "slow": 0, "offline": 0},
        "created_at": datetime.now(timezone.utc)
    },
    {
        "site_code": "NM_DONG_THAP",
        "code_nm": "DT-69EC881899064464BDEE46EA",
        "site_name": "NM-Đồng Tháp",
        "location": "Đồng Tháp",
        "subnet_ranges": [],
        "agent_status": "offline",
        "last_heartbeat": None,
        "device_stats": {"total": 0, "online": 0, "slow": 0, "offline": 0},
        "created_at": datetime.now(timezone.utc)
    },
    {
        "site_code": "NM_HOANG_QUYNH",
        "code_nm": "HQ-D92357730AA423A8E4EB1869",
        "site_name": "NM-Hoang Quynh",
        "location": "TP. Hồ Chí Minh",
        "subnet_ranges": [],
        "agent_status": "offline",
        "last_heartbeat": None,
        "device_stats": {"total": 0, "online": 0, "slow": 0, "offline": 0},
        "created_at": datetime.now(timezone.utc)
    },
    {
        "site_code": "SABIBECO_HO",
        "code_nm": "HO-79601340F79939ED2FA0B2F5",
        "site_name": "Sabibeco HO",
        "location": "Trụ sở chính TP.HCM",
        "subnet_ranges": [],
        "agent_status": "offline",
        "last_heartbeat": None,
        "device_stats": {"total": 0, "online": 0, "slow": 0, "offline": 0},
        "created_at": datetime.now(timezone.utc)
    },
    {
        "site_code": "TMDV_BINH_TAY",
        "code_nm": "BT-62584DFDAF9F80D44D56A915",
        "site_name": "TMDV BSG Bình Tây",
        "location": "TP. Hồ Chí Minh",
        "subnet_ranges": [],
        "agent_status": "offline",
        "last_heartbeat": None,
        "device_stats": {"total": 0, "online": 0, "slow": 0, "offline": 0},
        "created_at": datetime.now(timezone.utc)
    }
]

async def connect_to_mongo():
    logger.info("Connecting to MongoDB at %s...", settings.MONGODB_URL)
    db_helper.client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000
    )
    db_helper.db = db_helper.client[settings.DATABASE_NAME]

    try:
        # Ping mongo
        await db_helper.client.admin.command('ping')
        logger.info("MongoDB connected successfully!")
        
        # Setup indexes
        await init_db_indexes()
        # Seed initial sites
        await seed_sites_if_empty()
    except Exception as e:
        logger.warning("Could not complete MongoDB init (is MongoDB running?): %s", e)

async def close_mongo_connection():
    if db_helper.client:
        logger.info("Closing MongoDB connection...")
        db_helper.client.close()

async def init_db_indexes():
    """Create indexes for sites, devices, status_logs (with TTL) and alerts"""
    db = db_helper.db
    if db is None:
        return

    # Sites indexes
    await db.sites.create_index("site_code", unique=True)
    await db.sites.create_index("agent_status")

    # Devices indexes
    await db.devices.create_index([("site_code", 1), ("ip", 1)], unique=True)
    await db.devices.create_index([("site_code", 1), ("status", 1)])
    await db.devices.create_index("mac")
    await db.devices.create_index("last_seen")

    # Status logs indexes with TTL of 30 days (2,592,000s)
    await db.status_logs.create_index("timestamp", expireAfterSeconds=2592000)
    await db.status_logs.create_index([("site_code", 1), ("device_ip", 1), ("timestamp", -1)])

    # Alerts indexes
    await db.alerts.create_index([("site_code", 1), ("acknowledged", 1), ("created_at", -1)])
    logger.info("MongoDB indexes verified.")

async def seed_sites_if_empty():
    db = db_helper.db
    if db is None:
        return

    count = await db.sites.count_documents({})
    if count == 0:
        logger.info("Seeding initial 7 factory sites...")
        await db.sites.insert_many(INITIAL_SITES)
        logger.info("Seeded %d sites successfully.", len(INITIAL_SITES))

def get_database() -> AsyncIOMotorDatabase:
    return db_helper.db
