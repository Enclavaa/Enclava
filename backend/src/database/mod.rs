use color_eyre::Result;

use crate::types::UserDb;

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
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO agents (name, description, price, owner_id, dataset_path, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
        name,
        description,
        price,
        owner_id,
        dataset_path,
        "active"
    )
    .execute(&mut **tx)
    .await?;

    Ok(())
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
