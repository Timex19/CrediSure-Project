"""Explicit, idempotent local assessment initialization: python -m app.seed."""

from datetime import date, timedelta

from argon2 import PasswordHasher

from app.config import Settings
from app.database import connect, initialize

_LEGACY_FIRST_NAMES = (
    "Amara",
    "Daniel",
    "Chioma",
    "James",
    "Fatima",
    "Emmanuel",
    "Zara",
    "David",
    "Ada",
    "Samuel",
    "Aisha",
    "Michael",
    "Grace",
    "Tunde",
    "Nneka",
    "Ibrahim",
)
_LEGACY_LAST_NAMES = ("Okafor", "Adeyemi", "Bello", "Eze", "Williams")


# Explicit fictional profiles avoid repeating a first-name/surname cross product.
DEMO_USER_NAMES = (
    "Amara Okafor",
    "Tobiloba Adeyemi",
    "Chioma Nwankwo",
    "Chinedu Eze",
    "Fatima Abdullahi",
    "Emeka Obi",
    "Zainab Bello",
    "Oluwaseun Adebayo",
    "Adaeze Okonkwo",
    "Damilola Akinwale",
    "Aisha Mohammed",
    "Chukwudi Nnamdi",
    "Folashade Ogunleye",
    "Babatunde Oladipo",
    "Nneka Umeh",
    "Ibrahim Sani",
    "Chiamaka Onyekwere",
    "Olumide Ajayi",
    "Hauwa Garba",
    "Ikenna Nwosu",
    "Temitope Balogun",
    "Obinna Ekwueme",
    "Aminat Yusuf",
    "Olakunle Adegbite",
    "Uchenna Onwudiwe",
    "Nnamdi Ibe",
    "Aderonke Osundare",
    "Suleiman Musa",
    "Ogechi Ezeani",
    "Adewale Afolayan",
    "Maryam Ibrahim",
    "Ifeanyi Okeke",
    "Abimbola Ojo",
    "Chijioke Anozie",
    "Khadija Usman",
    "Ayodeji Fashola",
    "Ngozi Nwachukwu",
    "Jide Alabi",
    "Yetunde Lawal",
    "Abubakar Danjuma",
    "Chinelo Opara",
    "Oladimeji Akinola",
    "Hadiza Kabiru",
    "Osagie Igbinedion",
    "Ebele Nwobodo",
    "Akinwumi Sobowale",
    "Funmilayo Adesina",
    "Mubarak Gidado",
    "Adesewa Shonibare",
    "Chibuzor Ezeoha",
    "Nafisa Shehu",
    "Oghenekaro Okotie",
    "Ndidi Madubuko",
    "Taiwo Adegoke",
    "Omotola Fadeyi",
    "Abdulrahman Dantata",
    "Ezinne Uzochukwu",
    "Olalekan Onabanjo",
    "Halima Maiyaki",
    "Akachukwu Enemuo",
    "Morenike Akinpelu",
    "Kelechi Uzodimma",
    "Efemena Edevbie",
    "Anietie Udoh",
    "Simiat Salami",
    "Chukwuma Igwe",
    "Nkiruka Okwuosa",
    "Terna Aondoakaa",
    "Iniobong Etim",
    "Boluwatife Adetunji",
    "Chidinma Iheanacho",
    "Farouk Rabiu",
    "Oluwakemi Arowolo",
    "Esosa Obaseki",
    "Ijeoma Okechukwu",
    "Tochukwu Nwafor",
    "Rukayat Bamidele",
    "Opeyemi Ogundipe",
    "Arit Ekong",
    "Umar Suleiman",
)


def seed(settings: Settings) -> None:
    email, password = settings.administrator_credentials()
    initialize(settings)
    with connect(settings) as database:
        database.lock_administrators()
        existing = database.execute(
            "SELECT id FROM administrators WHERE email = :email", {"email": email}
        ).fetchone()
        if existing is None:
            if database.execute(
                "SELECT COUNT(*) AS total FROM administrators"
            ).fetchone()["total"]:
                raise ValueError(
                    "An administrator already exists; seeding will not replace it"
                )
            database.execute(
                "INSERT INTO administrators(id, email, password_hash) "
                "VALUES (1, :email, :hash)",
                {"email": email, "hash": PasswordHasher().hash(password)},
            )
        for index, full_name in enumerate(DEMO_USER_NAMES):
            user_email = full_name.lower().replace(" ", ".") + "@example.com"
            database.execute(
                "INSERT INTO users VALUES "
                "(:id, :name, :email, :role, :status, :joined) "
                "ON CONFLICT DO NOTHING",
                {
                    "id": index + 1,
                    "name": full_name,
                    "email": user_email,
                    "role": "admin" if index % 9 == 0 else "member",
                    "status": ("active", "active", "active", "pending", "inactive")[
                        index % 5
                    ],
                    "joined": (
                        date(2026, 1, 5) + timedelta(days=index * 3)
                    ).isoformat(),
                },
            )
            # Upgrade only identifiable old demo rows, never edited/custom profiles.
            old_first = _LEGACY_FIRST_NAMES[index % len(_LEGACY_FIRST_NAMES)]
            old_last = _LEGACY_LAST_NAMES[index // len(_LEGACY_FIRST_NAMES)]
            database.execute(
                "UPDATE users SET full_name = :name, email = :email "
                "WHERE id = :id AND full_name = :old_name AND email = :old_email",
                {
                    "name": full_name,
                    "email": user_email,
                    "id": index + 1,
                    "old_name": f"{old_first} {old_last}",
                    "old_email": f"{old_first.lower()}.{old_last.lower()}@example.com",
                },
            )


if __name__ == "__main__":
    try:
        seed(Settings())
    except ValueError as error:
        raise SystemExit(str(error)) from None
    print(
        "Database initialized. Synthetic users seeded; existing credentials preserved."
    )
