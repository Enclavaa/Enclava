use color_eyre::Result;

use crate::types::{AgentCategory, AgentDb, UserDb};

pub async fn insert_user(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    address: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO users (address)
        VALUES ($1)
        ON CONFLICT (address) DO NOTHING
        "#,
        address,
    )
    .execute(&mut **tx)
    .await?;

    Ok(())
}

pub async fn insert_new_agent(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    name: &str,
    description: &str,
    price: f64,
    owner_id: i64,
    dataset_path: &str,
    category: &AgentCategory,
    file_size: f64,
) -> Result<AgentDb, sqlx::Error> {
    let record = sqlx::query_as::<_, AgentDb>(
        r#"
        WITH inserted AS (
    INSERT INTO agents (name, description, price, owner_id, dataset_path, category, status, dataset_size)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, name, description, price, owner_id, dataset_path, category, dataset_size, status, created_at, updated_at, nft_id, nft_tx
)
SELECT i.*, u.address AS owner_address
FROM inserted i
JOIN users u ON i.owner_id = u.id;
        "#,
    )
    .bind(name)
    .bind(description)
    .bind(price)
    .bind(owner_id)
    .bind(dataset_path)
    .bind(category.clone())
    .bind("active")
    .bind(file_size)
    .fetch_one(&mut **tx)
    .await?;

    Ok(record)
}

pub async fn get_user_by_address(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    address: &str,
) -> Result<Option<UserDb>, sqlx::Error> {
    let user = sqlx::query_as!(
        UserDb,
        r#"
        SELECT id, address
        FROM users
        WHERE address = $1
        "#,
        address
    )
    .fetch_optional(&mut **tx)
    .await?;

    Ok(user)
}

pub async fn get_agent_by_id_optional(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    id: i64,
) -> Result<Option<AgentDb>, sqlx::Error> {
    let agent = sqlx::query_as!(
        AgentDb,
        r#"
        SELECT
        g.id,
        g.name,
        g.description,
        g.price,
        g.owner_id,
        g.dataset_path,
        g.status,
        g.category as "category: AgentCategory",
        g.dataset_size,
        g.created_at,
        g.updated_at, 
        g.nft_id,
        g.nft_tx,
        u.address as "owner_address: String"
    FROM agents g
    JOIN users u ON g.owner_id = u.id
    WHERE g.id = $1
        "#,
        id
    )
    .fetch_optional(&mut **tx)
    .await?;

    Ok(agent)
}

pub async fn update_agent_with_nft_details(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    agent_id: i64,
    nft_id: i64,
    nft_tx: Option<String>,
) -> Result<(), sqlx::Error> {
    let update_result = sqlx::query!(
        r#"
        UPDATE agents
        SET nft_id = $1, nft_tx = $2
        WHERE id = $3
        "#,
        nft_id,
        nft_tx,
        agent_id
    )
    .execute(&mut **tx)
    .await?;

    if update_result.rows_affected() != 1 {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(())
}

pub async fn get_agents_by_ids(
    db: &sqlx::Pool<sqlx::Postgres>,
    agent_ids: &Vec<i64>,
) -> Result<Vec<AgentDb>, sqlx::Error> {
    let agents = sqlx::query_as!(
        AgentDb,
        r#"
        SELECT
        g.id,
        g.name,
        g.description,
        g.price,
        g.owner_id,
        g.dataset_path,
        g.status,
        g.category as "category: AgentCategory",
        g.dataset_size,
        g.created_at,
        g.updated_at, 
        g.nft_id,
        g.nft_tx,
        u.address as "owner_address: String"
    FROM agents g
    JOIN users u ON g.owner_id = u.id
    WHERE g.id = ANY($1)
        "#,
        agent_ids
    )
    .fetch_all(db)
    .await?;

    Ok(agents)
}

// Get Agents by user address
pub async fn get_agents_by_user_address(
    db: &sqlx::Pool<sqlx::Postgres>,
    user_address: &str,
) -> Result<Vec<AgentDb>, sqlx::Error> {
    let agents = sqlx::query_as!(
        AgentDb,
        r#"
        SELECT
        g.id,
        g.name,
        g.description,
        g.price,
        g.owner_id,
        g.dataset_path,
        g.status,
        g.category as "category: AgentCategory",
        g.dataset_size,
        g.created_at,
        g.updated_at, 
        g.nft_id,
        g.nft_tx,
        u.address as "owner_address: String"
    FROM agents g
    JOIN users u ON g.owner_id = u.id
    WHERE u.address = $1
        "#,
        user_address
    )
    .fetch_all(db)
    .await?;

    Ok(agents)
}

pub async fn get_agent_by_id(
    db: &sqlx::Pool<sqlx::Postgres>,
    id: i64,
) -> Result<AgentDb, sqlx::Error> {
    let agent = sqlx::query_as!(
        AgentDb,
        r#"
        SELECT
        g.id,
        g.name,
        g.description,
        g.price,
        g.owner_id,
        g.dataset_path,
        g.status,
        g.category as "category: AgentCategory",
        g.dataset_size,
        g.created_at,
        g.updated_at, 
        g.nft_id,
        g.nft_tx,
        u.address as "owner_address: String"
    FROM agents g
    JOIN users u ON g.owner_id = u.id
    WHERE g.id = $1
        "#,
        id
    )
    .fetch_one(db)
    .await?;

    Ok(agent)
}
